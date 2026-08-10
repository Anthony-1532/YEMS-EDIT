import { pgTable, varchar, integer, boolean, timestamp, jsonb, text } from 'drizzle-orm/pg-core';

export const platformSettings = pgTable('platform_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  platformName: varchar('platform_name', { length: 255 }).notNull().default('Yeshua Educational Platform'),
  supportEmail: varchar('support_email', { length: 255 }).notNull().default('support@yems.local'),
  maxUsersPerInstitution: integer('max_users_per_institution').notNull().default(1000),
  sessionTimeout: integer('session_timeout').notNull().default(60),
  enable2FA: boolean('enable_2fa').notNull().default(false),
  forcePasswordChange: boolean('force_password_change').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type NewPlatformSettings = typeof platformSettings.$inferInsert;

export const backups = pgTable('backups', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  size: varchar('size', { length: 50 }).notNull().default('0 MB'),
  type: varchar('type', { length: 50 }).notNull().default('manual'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Backup = typeof backups.$inferSelect;
export type NewBackup = typeof backups.$inferInsert;

export const rbacRoles = pgTable('rbac_roles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type RbacRole = typeof rbacRoles.$inferSelect;
export type NewRbacRole = typeof rbacRoles.$inferInsert;
