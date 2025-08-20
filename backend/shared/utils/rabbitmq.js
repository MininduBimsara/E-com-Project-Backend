// shared/utils/rabbitmq.js
const amqp = require("amqplib");

class RabbitMQManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.exchange = process.env.RABBITMQ_EXCHANGE || "ecostore.events";
    this.queuePrefix = process.env.RABBITMQ_QUEUE_PREFIX || "ecostore";
    this.retryAttempts = parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RABBITMQ_RETRY_DELAY) || 1000;
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";
      console.log(`🐰 [RabbitMQ] Connecting to ${rabbitmqUrl}...`);

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Setup exchange
      await this.channel.assertExchange(this.exchange, "topic", {
        durable: true,
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log(
        `✅ [RabbitMQ] Connected and exchange '${this.exchange}' created`
      );

      // Handle connection events
      this.connection.on("error", this.handleConnectionError.bind(this));
      this.connection.on("close", this.handleConnectionClose.bind(this));

      return this.channel;
    } catch (error) {
      console.error(`❌ [RabbitMQ] Connection failed:`, error.message);
      await this.handleReconnection();
      throw error;
    }
  }

  async handleConnectionError(error) {
    console.error(`❌ [RabbitMQ] Connection error:`, error.message);
    this.isConnected = false;
    await this.handleReconnection();
  }

  async handleConnectionClose() {
    console.warn(`⚠️ [RabbitMQ] Connection closed`);
    this.isConnected = false;
    await this.handleReconnection();
  }

  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [RabbitMQ] Max reconnection attempts reached`);
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 [RabbitMQ] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error(`❌ [RabbitMQ] Reconnection failed:`, error.message);
      }
    }, this.reconnectDelay);
  }

  async ensureConnection() {
    if (!this.isConnected || !this.channel) {
      await this.connect();
    }
    return this.channel;
  }

  async publishEvent(routingKey, eventData, options = {}) {
    try {
      await this.ensureConnection();

      const message = {
        eventType: routingKey,
        data: eventData,
        metadata: {
          timestamp: new Date().toISOString(),
          source: options.source || "unknown-service",
          version: options.version || "1.0",
          correlationId: options.correlationId || this.generateCorrelationId(),
        },
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const publishOptions = {
        persistent: true,
        contentType: "application/json",
        timestamp: Date.now(),
        ...options.publishOptions,
      };

      const published = this.channel.publish(
        this.exchange,
        routingKey,
        messageBuffer,
        publishOptions
      );

      if (published) {
        console.log(`📤 [RabbitMQ] Event published: ${routingKey}`, {
          correlationId: message.metadata.correlationId,
          source: message.metadata.source,
          dataKeys: Object.keys(eventData),
        });
        return message.metadata.correlationId;
      } else {
        throw new Error("Failed to publish message to exchange");
      }
    } catch (error) {
      console.error(
        `❌ [RabbitMQ] Failed to publish event ${routingKey}:`,
        error.message
      );

      // Don't throw error - let business logic continue
      if (options.throwOnError) {
        throw error;
      }
      return null;
    }
  }

  async setupConsumer(serviceName, routingKeys, messageHandler, options = {}) {
    try {
      await this.ensureConnection();

      const queueName = `${this.queuePrefix}.${serviceName}.events`;
      const dlqName = `${queueName}.dlq`;

      // Setup Dead Letter Queue
      await this.channel.assertQueue(dlqName, {
        durable: true,
        arguments: {
          "x-message-ttl": options.dlqTtl || 24 * 60 * 60 * 1000, // 24 hours
        },
      });

      // Setup main queue with DLQ
      const queueOptions = {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": this.exchange,
          "x-dead-letter-routing-key": `${queueName}.dlq`,
          "x-max-retries": this.retryAttempts,
          ...options.queueArguments,
        },
      };

      await this.channel.assertQueue(queueName, queueOptions);

      // Bind queue to routing keys
      for (const routingKey of routingKeys) {
        await this.channel.bindQueue(queueName, this.exchange, routingKey);
        console.log(
          `🔗 [RabbitMQ] Queue '${queueName}' bound to '${routingKey}'`
        );
      }

      // Setup consumer
      const consumerOptions = {
        noAck: false,
        prefetch: options.prefetch || 1,
        ...options.consumerOptions,
      };

      if (consumerOptions.prefetch) {
        await this.channel.prefetch(consumerOptions.prefetch);
      }

      await this.channel.consume(
        queueName,
        async (message) => {
          if (!message) return;

          try {
            const content = JSON.parse(message.content.toString());
            const routingKey = message.fields.routingKey;

            console.log(`📥 [RabbitMQ] Event received: ${routingKey}`, {
              correlationId: content.metadata?.correlationId,
              source: content.metadata?.source,
              attempt: this.getRetryCount(message),
            });

            // Call the message handler
            await messageHandler(content, routingKey, message);

            // Acknowledge successful processing
            this.channel.ack(message);

            console.log(
              `✅ [RabbitMQ] Event processed successfully: ${routingKey}`,
              {
                correlationId: content.metadata?.correlationId,
              }
            );
          } catch (error) {
            console.error(`❌ [RabbitMQ] Failed to process message:`, {
              routingKey: message.fields.routingKey,
              error: error.message,
              attempt: this.getRetryCount(message),
            });

            const retryCount = this.getRetryCount(message);

            if (retryCount >= this.retryAttempts) {
              console.error(
                `💀 [RabbitMQ] Max retries reached, sending to DLQ`
              );
              this.channel.nack(message, false, false); // Send to DLQ
            } else {
              console.log(
                `🔄 [RabbitMQ] Retrying message (attempt ${retryCount + 1})`
              );
              // Delay and retry
              setTimeout(() => {
                this.channel.nack(message, false, true);
              }, this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
            }
          }
        },
        { noAck: false }
      );

      console.log(`👂 [RabbitMQ] Consumer setup complete for ${serviceName}`);
      return queueName;
    } catch (error) {
      console.error(
        `❌ [RabbitMQ] Failed to setup consumer for ${serviceName}:`,
        error.message
      );
      throw error;
    }
  }

  getRetryCount(message) {
    const deaths = message.properties.headers?.["x-death"];
    if (!deaths || !Array.isArray(deaths)) return 0;

    const death = deaths.find((d) => d.reason === "rejected");
    return death ? death.count : 0;
  }

  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log(`👋 [RabbitMQ] Connection closed`);
    } catch (error) {
      console.error(`❌ [RabbitMQ] Error closing connection:`, error.message);
    }
  }

  // Health check
  isHealthy() {
    return this.isConnected && this.channel && !this.channel.connection.closed;
  }

  // Get queue stats (useful for monitoring)
  async getQueueStats(queueName) {
    try {
      await this.ensureConnection();
      return await this.channel.checkQueue(queueName);
    } catch (error) {
      console.error(`❌ [RabbitMQ] Failed to get queue stats:`, error.message);
      return null;
    }
  }
}

// Event type constants
const EVENT_TYPES = {
  USER_CREATED: "user.created",
  ORDER_CREATED: "order.created",
  PAYMENT_SUCCESS: "payment.success",
  PAYMENT_FAILED: "payment.failed",
  CART_CLEARED: "cart.cleared",
  STOCK_UPDATED: "stock.updated",
};

// Create singleton instance
const rabbitmqManager = new RabbitMQManager();

module.exports = {
  rabbitmqManager,
  EVENT_TYPES,
  RabbitMQManager,
};
