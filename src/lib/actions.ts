import { z } from "zod";

export const noteSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  body: z.string().max(8000),
  quote: z.string().max(4000).nullable(),
  sourceType: z.enum(["message", "evidence", "free"]),
  sourceId: z.string().max(80).nullable(),
  speaker: z.string().max(120).nullable(),
  inWorldMinute: z.number().int().nullable(),
  tags: z.array(z.string().max(40)).max(12),
  personId: z.string().max(40).nullable(),
  locationId: z.string().max(40).nullable(),
  importance: z.enum(["low", "normal", "high"]),
  mark: z.enum(["unverified", "suspicious", "corroborated", "resolved"]),
  pinned: z.boolean(),
});

export const reportSchema = z.object({
  whereId: z.string().max(40),
  responsibleId: z.string().max(40),
  explanation: z.string().min(1).max(8000),
  motive: z.string().max(2000),
  uncertainties: z.string().max(2000),
  evidenceIds: z.array(z.string().max(80)).max(40),
});

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("travel"), locationId: z.string().max(40) }),
  z.object({
    type: z.literal("inspect"),
    locationId: z.string().max(40),
    regionId: z.string().max(40),
  }),
  z.object({ type: z.literal("request_record"), recordId: z.string().max(80) }),
  z.object({
    type: z.literal("interview"),
    characterId: z.string().max(40),
    text: z.string().min(1).max(2000),
    evidenceIds: z.array(z.string().max(80)).max(6),
  }),
  z.object({
    type: z.literal("say"),
    text: z.string().min(1).max(2000),
    evidenceIds: z.array(z.string().max(80)).max(6).optional(),
    confirm: z.boolean().optional(),
  }),
  z.object({ type: z.literal("open_annex"), confirm: z.literal(true) }),
  z.object({ type: z.literal("note_save"), note: noteSchema }),
  z.object({
    type: z.literal("note_delete"),
    id: z.string().min(1).max(80),
  }),
  z.object({
    type: z.literal("board_save"),
    nodes: z
      .array(
        z.object({
          id: z.string().max(80),
          kind: z.enum(["person", "place", "evidence", "note"]),
          refId: z.string().max(80),
          x: z.number(),
          y: z.number(),
          label: z.string().max(200),
        }),
      )
      .max(80),
    edges: z
      .array(
        z.object({
          id: z.string().max(80),
          source: z.string().max(80),
          target: z.string().max(80),
          label: z.string().max(160),
          state: z.enum(["confirmed", "suspected", "disproven"]),
        }),
      )
      .max(120),
  }),
  z.object({
    type: z.literal("contradiction_save"),
    card: z.object({
      id: z.string().max(80).optional(),
      claimAId: z.string().max(80),
      claimBId: z.string().max(80),
      explanation: z.string().max(4000),
      state: z.enum(["unverified", "suspected", "established"]),
    }),
  }),
  z.object({
    type: z.literal("contradiction_delete"),
    id: z.string().max(80),
  }),
  z.object({
    type: z.literal("timeline_add"),
    event: z.object({
      id: z.string().max(80).optional(),
      title: z.string().min(1).max(200),
      minute: z.number().int().nullable(),
      endMinute: z.number().int().nullable(),
      uncertain: z.boolean(),
      locationId: z.string().max(40).nullable(),
      personId: z.string().max(40).nullable(),
      sourceNote: z.string().max(500),
    }),
  }),
  z.object({
    type: z.literal("timeline_delete"),
    id: z.string().max(80),
  }),
  z.object({
    type: z.literal("hint_preview"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  z.object({
    type: z.literal("hint_take"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    confirm: z.literal(true),
  }),
  z.object({
    type: z.literal("compare"),
    ids: z.array(z.string().max(80)).min(2).max(4),
  }),
  z.object({
    type: z.literal("submit"),
    report: reportSchema,
    confirm: z.literal(true),
  }),
  z.object({ type: z.literal("review"), confirm: z.literal(true) }),
]);

export type GameAction = z.infer<typeof actionSchema>;
