/**
 * Migration: Add performance indexes for conversation retrieval optimization
 * 
 * This migration adds indexes to improve query performance for:
 * - Conversation lookups by user_id and id
 * - Message retrieval by conversation_id with ordering by createdAt
 * - Provider searches by specialty and location
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add composite index on conversations for user_id + id lookup
    await queryInterface.addIndex('conversations', ['user_id', 'id'], {
      name: 'idx_conversations_user_id_id',
      unique: false
    });

    // Add index on conversations for last_message_at (for sorting recent conversations)
    await queryInterface.addIndex('conversations', ['last_message_at'], {
      name: 'idx_conversations_last_message_at',
      unique: false
    });

    // Add composite index on messages for conversation_id + createdAt (for efficient message retrieval)
    await queryInterface.addIndex('messages', ['conversation_id', 'created_at'], {
      name: 'idx_messages_conversation_created',
      unique: false
    });

    // Add index on messages for role (for filtering user messages)
    await queryInterface.addIndex('messages', ['role'], {
      name: 'idx_messages_role',
      unique: false
    });

    // Add composite index on assessments for user_id + conversation_id
    await queryInterface.addIndex('assessments', ['user_id', 'conversation_id'], {
      name: 'idx_assessments_user_conversation',
      unique: false
    });

    // Add index on assessments for created_at (for sorting)
    await queryInterface.addIndex('assessments', ['created_at'], {
      name: 'idx_assessments_created_at',
      unique: false
    });

    // Add indexes on providers for location-based searches
    await queryInterface.addIndex('providers', ['specialty'], {
      name: 'idx_providers_specialty',
      unique: false
    });

    await queryInterface.addIndex('providers', ['latitude', 'longitude'], {
      name: 'idx_providers_location',
      unique: false
    });

    console.log('✅ Performance indexes added successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all indexes in reverse order
    await queryInterface.removeIndex('providers', 'idx_providers_location');
    await queryInterface.removeIndex('providers', 'idx_providers_specialty');
    await queryInterface.removeIndex('assessments', 'idx_assessments_created_at');
    await queryInterface.removeIndex('assessments', 'idx_assessments_user_conversation');
    await queryInterface.removeIndex('messages', 'idx_messages_role');
    await queryInterface.removeIndex('messages', 'idx_messages_conversation_created');
    await queryInterface.removeIndex('conversations', 'idx_conversations_last_message_at');
    await queryInterface.removeIndex('conversations', 'idx_conversations_user_id_id');

    console.log('✅ Performance indexes removed successfully');
  }
};
