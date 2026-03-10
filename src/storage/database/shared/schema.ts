import { pgTable, serial, timestamp, varchar, text, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户资料表（扩展示 Supabase Auth）
export const profiles = pgTable("profiles", {
	id: varchar("id", { length: 36 }).primaryKey(), // 关联 auth.users.id
	username: varchar("username", { length: 128 }),
	avatar_url: varchar("avatar_url", { length: 500 }),
	is_admin: integer("is_admin").notNull().default(0), // 是否管理员：0-否，1-是
	daily_quota: integer("daily_quota").notNull().default(10), // 登录用户每日配额
	phone: varchar("phone", { length: 20 }), // 手机号
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
});

// 使用记录表
export const usageLogs = pgTable("usage_logs", {
	id: serial().notNull(),
	user_id: varchar("user_id", { length: 36 }), // 可为空，未登录用户使用 IP 识别
	ip_address: varchar("ip_address", { length: 128 }).notNull(),
	usage_type: varchar("usage_type", { length: 50 }).notNull(), // plot, character, polish, outline
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
