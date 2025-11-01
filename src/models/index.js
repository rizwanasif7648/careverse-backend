const { sequelize } = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Assessment = require('./Assessment');
const Provider = require('./Provider');

// Define associations
User.hasMany(Conversation, {
  foreignKey: 'user_id',
  as: 'conversations'
});
Conversation.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Conversation.hasMany(Message, {
  foreignKey: 'conversation_id',
  as: 'messages'
});
Message.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  as: 'conversation'
});

User.hasMany(Assessment, {
  foreignKey: 'user_id',
  as: 'assessments'
});
Assessment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Conversation.hasMany(Assessment, {
  foreignKey: 'conversation_id',
  as: 'assessments'
});
Assessment.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  as: 'conversation'
});

// Sync all models
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ Database models synced successfully');
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Conversation,
  Message,
  Assessment,
  Provider,
  syncDatabase
};
