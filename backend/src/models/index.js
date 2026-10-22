const User = require("./User");
const Customer = require("./Customer");
const Service = require("./Service");

const Transaction = require("./Transaction");
const TransactionDetail = require("./TransactionDetail");

const AnalysisRun = require("./AnalysisRun");
const RfmResult = require("./RfmResult");
const Segment = require("./Segment");
const ClusterResult = require("./ClusterResult");

const PromotionStrategy = require("./PromotionStrategy");

const Campaign = require("./Campaign");

const CampaignTarget = require("./CampaignTarget");

const CampaignDeliveryLog = require("./CampaignDeliveryLog");

const Notification = require("./Notification");

const ChatSession = require("./ChatSession");

const ChatMessage = require("./ChatMessage");

// Customer ke Transactions
Customer.hasMany(Transaction, {
  foreignKey: "customerId",
  as: "transactions",
});

Transaction.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// User ke Transactions
User.hasMany(Transaction, {
  foreignKey: "createdBy",
  as: "createdTransactions",
});

Transaction.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// Transaction ke Details
Transaction.hasMany(TransactionDetail, {
  foreignKey: "transactionId",
  as: "items",
});

TransactionDetail.belongsTo(Transaction, {
  foreignKey: "transactionId",
  as: "transaction",
});

// Service ke Transaction Details
Service.hasMany(TransactionDetail, {
  foreignKey: "serviceId",
  as: "transactionDetails",
});

TransactionDetail.belongsTo(Service, {
  foreignKey: "serviceId",
  as: "service",
});

// ANALYSIS RUN
User.hasMany(
    AnalysisRun,
    {
        foreignKey: 'createdBy',
        as: 'analysisRuns'
    }
);

AnalysisRun.belongsTo(
    User,
    {
        foreignKey: 'createdBy',
        as: 'creator'
    }
);


// RFM RESULTS
AnalysisRun.hasMany(
    RfmResult,
    {
        foreignKey: 'analysisRunId',
        as: 'rfmResults'
    }
);

RfmResult.belongsTo(
    AnalysisRun,
    {
        foreignKey: 'analysisRunId',
        as: 'analysisRun'
    }
);


Customer.hasMany(
    RfmResult,
    {
        foreignKey: 'customerId',
        as: 'rfmResults'
    }
);

RfmResult.belongsTo(
    Customer,
    {
        foreignKey: 'customerId',
        as: 'customer'
    }
);

// CLUSTER RESULTS
AnalysisRun.hasMany(
    ClusterResult,
    {
        foreignKey: 'analysisRunId',
        as: 'clusterResults'
    }
);

ClusterResult.belongsTo(
    AnalysisRun,
    {
        foreignKey: 'analysisRunId',
        as: 'analysisRun'
    }
);


Customer.hasMany(
    ClusterResult,
    {
        foreignKey: 'customerId',
        as: 'clusterResults'
    }
);

ClusterResult.belongsTo(
    Customer,
    {
        foreignKey: 'customerId',
        as: 'customer'
    }
);


RfmResult.hasOne(
    ClusterResult,
    {
        foreignKey: 'rfmResultId',
        as: 'clusterResult'
    }
);

ClusterResult.belongsTo(
    RfmResult,
    {
        foreignKey: 'rfmResultId',
        as: 'rfmResult'
    }
);


Segment.hasMany(
    ClusterResult,
    {
        foreignKey: 'segmentId',
        as: 'clusterResults'
    }
);

ClusterResult.belongsTo(
    Segment,
    {
        foreignKey: 'segmentId',
        as: 'segment'
    }
);

// PROMOTION STRATEGIES
Segment.hasMany(
    PromotionStrategy,
    {
        foreignKey: 'segmentId',
        as: 'promotionStrategies'
    }
);

PromotionStrategy.belongsTo(
    Segment,
    {
        foreignKey: 'segmentId',
        as: 'segment'
    }
);


// CAMPAIGNS
AnalysisRun.hasMany(
    Campaign,
    {
        foreignKey: 'analysisRunId',
        as: 'campaigns'
    }
);

Campaign.belongsTo(
    AnalysisRun,
    {
        foreignKey: 'analysisRunId',
        as: 'analysisRun'
    }
);


Segment.hasMany(
    Campaign,
    {
        foreignKey: 'segmentId',
        as: 'campaigns'
    }
);

Campaign.belongsTo(
    Segment,
    {
        foreignKey: 'segmentId',
        as: 'segment'
    }
);


PromotionStrategy.hasMany(
    Campaign,
    {
        foreignKey: 'promotionStrategyId',
        as: 'campaigns'
    }
);

Campaign.belongsTo(
    PromotionStrategy,
    {
        foreignKey: 'promotionStrategyId',
        as: 'promotionStrategy'
    }
);


User.hasMany(
    Campaign,
    {
        foreignKey: 'createdBy',
        as: 'createdCampaigns'
    }
);

Campaign.belongsTo(
    User,
    {
        foreignKey: 'createdBy',
        as: 'creator'
    }
);

// CAMPAIGN TARGETS
Campaign.hasMany(
    CampaignTarget,
    {
        foreignKey: 'campaignId',
        as: 'targets'
    }
);

CampaignTarget.belongsTo(
    Campaign,
    {
        foreignKey: 'campaignId',
        as: 'campaign'
    }
);


Customer.hasMany(
    CampaignTarget,
    {
        foreignKey: 'customerId',
        as: 'campaignTargets'
    }
);

CampaignTarget.belongsTo(
    Customer,
    {
        foreignKey: 'customerId',
        as: 'customer'
    }
);


Segment.hasMany(
    CampaignTarget,
    {
        foreignKey: 'segmentId',
        as: 'campaignTargets'
    }
);

CampaignTarget.belongsTo(
    Segment,
    {
        foreignKey: 'segmentId',
        as: 'segment'
    }
);


AnalysisRun.hasMany(
    CampaignTarget,
    {
        foreignKey: 'analysisRunId',
        as: 'campaignTargets'
    }
);

CampaignTarget.belongsTo(
    AnalysisRun,
    {
        foreignKey: 'analysisRunId',
        as: 'analysisRun'
    }
);

// DELIVERY LOGS
Campaign.hasMany(
    CampaignDeliveryLog,
    {
        foreignKey: 'campaignId',
        as: 'deliveryLogs'
    }
);

CampaignDeliveryLog.belongsTo(
    Campaign,
    {
        foreignKey: 'campaignId',
        as: 'campaign'
    }
);


Customer.hasMany(
    CampaignDeliveryLog,
    {
        foreignKey: 'customerId',
        as: 'campaignDeliveryLogs'
    }
);

CampaignDeliveryLog.belongsTo(
    Customer,
    {
        foreignKey: 'customerId',
        as: 'customer'
    }
);

User.hasMany(Notification, {
  foreignKey: "userId",

  as: "notifications",
});

Notification.belongsTo(User, {
  foreignKey: "userId",

  as: "user",
});

User.hasMany(ChatSession, {
  foreignKey: "userId",

  as: "chatSessions",
});

ChatSession.belongsTo(User, {
  foreignKey: "userId",

  as: "user",
});

ChatSession.hasMany(ChatMessage, {
  foreignKey: "chatSessionId",

  as: "messages",
});

ChatMessage.belongsTo(ChatSession, {
  foreignKey: "chatSessionId",

  as: "session",
});

module.exports = {
  User,
  Customer,
  Service,
  Transaction,
  TransactionDetail,
  AnalysisRun,
  RfmResult,
  Segment,
  ClusterResult,
  PromotionStrategy,
  Campaign,
  CampaignTarget,
  CampaignDeliveryLog,
  Notification,
  ChatSession,
  ChatMessage,
};