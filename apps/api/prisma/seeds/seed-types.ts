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
  subCounties: {
    turkanaCentral: string;
    turkanaNorth: string;
    turkanaWest: string;
    loima: string;
    turkanaSouth: string;
    turkanaEast: string;
    nakuruTownEast: string;
  };
  wards: {
    lodwar: string;
    kanamkemer: string;
    kakuma: string;
    // Turkana North
    kaeris: string;
    lakeZone: string;
    lapur: string;
    kaalengKaikor: string;
    kibish: string;
    nakalale: string;
    // Turkana West
    lopur: string;
    letea: string;
    songot: string;
    kalobeyei: string;
    lokichoggio: string;
    nanaam: string;
    // Turkana Central
    kerioDelta: string;
    kangatotha: string;
    kalokol: string;
    // Loima
    kotarukLobei: string;
    turkwel: string;
    loima: string;
    lokiriamaLorengippi: string;
    // Turkana South
    kaputir: string;
    katilu: string;
    lobokat: string;
    kalapata: string;
    lokichar: string;
    // Turkana East
    kapedoNapeitom: string;
    katilia: string;
    lokoriKochodin: string;
    // Nakuru
    biashara: string;
    kivumbini: string;
  };
  villageUnits: {
    lodwarTown: string;
    nadapal: string;
    napetet: string;
    kanamkemerCenter: string;
    naipa: string;
    kakumaOne: string;
    kalobeyei: string;
  };
  users: {
    platformOperator: string;
    countyAdmin: string;
    financeOfficer: string;
    wardAdmin: string;
    villageAdminLodwar: string;
    villageAdminKanamkemer: string;
    villageAdminKakuma: string;
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
