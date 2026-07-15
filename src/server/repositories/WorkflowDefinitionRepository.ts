/**
 * WorkflowDefinitionRepository — the single Prisma access point for the visual
 * workflow graphs (the "what should happen" definitions). Thin + typed; graph
 * JSON is validated at the service/action boundary.
 */
import type {
  WorkflowGraph,
  WorkflowProcessKey,
  WorkflowTrigger,
} from "@/features/fairtrain-funnel/automation/workflow/graph";

import { prisma } from "../db/prisma";

export type WorkflowStatus = "draft" | "active" | "inactive";

export interface WorkflowDefinitionRecord {
  id: string;
  name: string;
  description: string | null;
  processKey: WorkflowProcessKey;
  trigger: WorkflowTrigger;
  status: WorkflowStatus;
  version: number;
  graph: string; // raw JSON
  createdAt: Date;
  updatedAt: Date;
}

export interface WriteWorkflowInput {
  name: string;
  description?: string | null;
  processKey: WorkflowProcessKey;
  trigger: WorkflowTrigger;
  status: WorkflowStatus;
  graph: WorkflowGraph;
}

function toRecord(row: {
  id: string;
  name: string;
  description: string | null;
  processKey: string;
  trigger: string;
  status: string;
  version: number;
  graph: string;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowDefinitionRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    processKey: row.processKey as WorkflowProcessKey,
    trigger: row.trigger as WorkflowTrigger,
    status: row.status as WorkflowStatus,
    version: row.version,
    graph: row.graph,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class WorkflowDefinitionRepository {
  async list(): Promise<WorkflowDefinitionRecord[]> {
    const rows = await prisma.workflowDefinition.findMany({
      orderBy: [{ processKey: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<WorkflowDefinitionRecord | null> {
    const row = await prisma.workflowDefinition.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async listActiveByTrigger(
    trigger: WorkflowTrigger,
  ): Promise<WorkflowDefinitionRecord[]> {
    const rows = await prisma.workflowDefinition.findMany({
      where: { trigger, status: "active" },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRecord);
  }

  async firstActiveByProcess(
    processKey: WorkflowProcessKey,
  ): Promise<WorkflowDefinitionRecord | null> {
    const row = await prisma.workflowDefinition.findFirst({
      where: { processKey, status: "active" },
      orderBy: { createdAt: "asc" },
    });
    return row ? toRecord(row) : null;
  }

  async findBySlugName(name: string): Promise<WorkflowDefinitionRecord | null> {
    const row = await prisma.workflowDefinition.findFirst({ where: { name } });
    return row ? toRecord(row) : null;
  }

  async create(input: WriteWorkflowInput): Promise<WorkflowDefinitionRecord> {
    const row = await prisma.workflowDefinition.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        processKey: input.processKey,
        trigger: input.trigger,
        status: input.status,
        version: 1,
        graph: JSON.stringify(input.graph),
      },
    });
    return toRecord(row);
  }

  async update(
    id: string,
    input: WriteWorkflowInput,
  ): Promise<WorkflowDefinitionRecord> {
    // Editing bumps the version so already-running leads keep their snapshot.
    const row = await prisma.workflowDefinition.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description ?? null,
        processKey: input.processKey,
        trigger: input.trigger,
        status: input.status,
        graph: JSON.stringify(input.graph),
        version: { increment: 1 },
      },
    });
    return toRecord(row);
  }

  async setStatus(id: string, status: WorkflowStatus): Promise<void> {
    await prisma.workflowDefinition.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await prisma.workflowDefinition.delete({ where: { id } });
  }
}

export const workflowDefinitionRepository = new WorkflowDefinitionRepository();
