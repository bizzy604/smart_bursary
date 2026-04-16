import { create } from "zustand";
import { countyBranding, type CountyBranding } from "@/lib/student-data";

interface CountyState {
	county: CountyBranding;
	setCounty: (county: CountyBranding) => void;
}

export const useCountyStore = create<CountyState>((set) => ({
	county: countyBranding,
	setCounty: (county) => {
		set({ county });
	},
}));

