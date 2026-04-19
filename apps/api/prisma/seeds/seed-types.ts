/**
 * Purpose: Share seed context types and constants across Prisma seed modules.
 * Why important: Keeps deterministic IDs and shared settings centralized.
 * Used by: Foundation, program, workflow, and artifact seed routines.
 */
export const DEV_PASSWORD = 'SmartBursary@123';

export type SeedContext = {
  county: {
    turkana: string;
    nakuru: string;
  };
  wards: {
    lodwar: string;
    kanamkemer: string;
    kakuma: string;
  };
  users: {
    platformOperator: string;
    countyAdmin: string;
    financeOfficer: string;
    wardAdmin: string;
    aisha: string;
    brian: string;
    carol: string;
    dan: string;
    eve: string;
    fatma: string;
    gideon: string;
    hana: string;
    nakuruAdmin: string;
  };
};

export type ProgramContext = {
  main: string;
  ward: string;
  legacy: string;
};

export type ApplicationContext = {
  aishaSubmitted: string;
  aishaDraft: string;
  brianWard: string;
  carolCounty: string;
  danApproved: string;
  eveDisbursed: string;
  fatmaRejected: string;
  gideonWaitlist: string;
  hanaLegacy: string;
};
