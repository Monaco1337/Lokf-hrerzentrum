/**
 * AutomationRuleRepository — admin-configurable automation rules.
 *
 * `conditions`/`actions` are stored as JSON strings and validated via zod at
 * the boundary. `isDemo` is resolved through the DemoSeedEntry registry.
 */
import {
  type AutomationRuleEntry,
  type AutomationTrigger,
  type RuleAction,
  RuleActionSchema,
  type RuleCondition,
  RuleConditionSchema,
  type RuleStatus,
  RuleStatusSchema,
  type RunMode,
  RunModeSchema,
} from "@/features/fairtrain-funnel/types";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { demoSeedRepository } from "./DemoSeedRepository";
import { parseAutomationTrigger } from "./types";

const ConditionsSchema = z.array(RuleConditionSchema);
const ActionsSchema = z.array(RuleActionSchema);

function parseConditions(raw: string): RuleCondition[] {
  try {
    return ConditionsSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseActions(raw: string): RuleAction[] {
  try {
    return ActionsSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

interface RuleRow {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  conditions: string;
  actions: string;
  status: string;
  runMode: string;
  lastRunAt: Date | null;
  runCount: number;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: RuleRow, demoIds: ReadonlySet<string>): AutomationRuleEntry {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    trigger: parseAutomationTrigger(row.trigger),
    conditions: parseConditions(row.conditions),
    actions: parseActions(row.actions),
    status: RuleStatusSchema.parse(row.status),
    runMode: RunModeSchema.parse(row.runMode),
    lastRunAt: row.lastRunAt,
    runCount: row.runCount,
    errorCount: row.errorCount,
    isDemo: demoIds.has(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface UpsertAutomationRuleInput {
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  status: RuleStatus;
  runMode: RunMode;
}

export class AutomationRuleRepository {
  private async demoIds(): Promise<Set<string>> {
    return new Set(await demoSeedRepository.listByType("AutomationRule"));
  }

  async list(): Promise<AutomationRuleEntry[]> {
    const [rows, demoIds] = await Promise.all([
      prisma.automationRule.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      }),
      this.demoIds(),
    ]);
    return rows.map((r) => mapRow(r, demoIds));
  }

  async findById(id: string): Promise<AutomationRuleEntry | null> {
    const [row, demoIds] = await Promise.all([
      prisma.automationRule.findUnique({ where: { id } }),
      this.demoIds(),
    ]);
    return row ? mapRow(row, demoIds) : null;
  }

  async create(input: UpsertAutomationRuleInput): Promise<AutomationRuleEntry> {
    const row = await prisma.automationRule.create({
      data: {
        name: input.name,
        description: input.description,
        trigger: input.trigger,
        conditions: JSON.stringify(input.conditions),
        actions: JSON.stringify(input.actions),
        status: input.status,
        runMode: input.runMode,
      },
    });
    return mapRow(row, await this.demoIds());
  }

  async update(
    id: string,
    patch: Partial<UpsertAutomationRuleInput>,
  ): Promise<AutomationRuleEntry> {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.trigger !== undefined) data.trigger = patch.trigger;
    if (patch.conditions !== undefined)
      data.conditions = JSON.stringify(patch.conditions);
    if (patch.actions !== undefined) data.actions = JSON.stringify(patch.actions);
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.runMode !== undefined) data.runMode = patch.runMode;
    const row = await prisma.automationRule.update({ where: { id }, data });
    return mapRow(row, await this.demoIds());
  }

  async delete(id: string): Promise<void> {
    await prisma.automationRule.delete({ where: { id } });
  }

  async recordRun(id: string, hadError: boolean): Promise<void> {
    await prisma.automationRule.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        runCount: { increment: 1 },
        ...(hadError ? { errorCount: { increment: 1 } } : {}),
      },
    });
  }
}

export const automationRuleRepository = new AutomationRuleRepository();
