import { z } from 'zod';

export const cocMemberSchema = z.object({
  tag: z.string(),
  name: z.string(),
  role: z.enum(['leader', 'coLeader', 'admin', 'member']), // 'admin' = Elder in the CoC API
  townHallLevel: z.number(),
  donations: z.number(),
  donationsReceived: z.number(),
});

export const cocMembersResponse = z.object({ items: z.array(cocMemberSchema) });

const cocWarClan = z.object({
  tag: z.string().optional(),
  name: z.string().optional(),
  stars: z.number(),
  destructionPercentage: z.number(),
  attacks: z.number().optional(),
  members: z.array(z.object({
    tag: z.string(),
    name: z.string(),
    mapPosition: z.number(),
    attacks: z.array(z.object({
      stars: z.number(),
      destructionPercentage: z.number(),
    })).optional(),
  })).optional(),
});

export const cocCurrentWarResponse = z.object({
  state: z.enum(['notInWar', 'preparation', 'inWar', 'warEnded']),
  teamSize: z.number().optional(),
  attacksPerMember: z.number().optional(),
  endTime: z.string().optional(),
  startTime: z.string().optional(),
  clan: cocWarClan.optional(),
  opponent: cocWarClan.optional(),
});

export const cocLeagueGroupResponse = z.object({
  state: z.string(),
  season: z.string().optional(),
  clans: z.array(z.object({ tag: z.string(), name: z.string() })),
  rounds: z.array(z.object({ warTags: z.array(z.string()) })),
});

export const cocClanWarLeagueWar = z.object({
  state: z.enum(['notInWar', 'preparation', 'inWar', 'warEnded']),
  teamSize: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  clan: cocWarClan,
  opponent: cocWarClan,
});

export const cocRaidSeasonsResponse = z.object({
  items: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    members: z.array(z.object({
      tag: z.string(),
      name: z.string(),
      attacks: z.number(),
      attackLimit: z.number(),
      bonusAttackLimit: z.number().default(0),
      capitalResourcesLooted: z.number(),
    })).optional(),
  })),
});

export const cocPlayerResponse = z.object({
  achievements: z.array(z.object({ name: z.string(), value: z.number() })).default([]),
});

export type CocMember = z.infer<typeof cocMemberSchema>;
export type CocCurrentWar = z.infer<typeof cocCurrentWarResponse>;
export type CocLeagueGroup = z.infer<typeof cocLeagueGroupResponse>;
export type CocClanWarLeagueWar = z.infer<typeof cocClanWarLeagueWar>;
export type CocRaidSeasons = z.input<typeof cocRaidSeasonsResponse>;
