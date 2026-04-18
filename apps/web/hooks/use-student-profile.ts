"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchStudentProfile } from "@/lib/student-api";
import type { StudentProfileSnapshot } from "@/lib/student-types";

export function useStudentProfile() {
  const [profile, setProfile] = useState<StudentProfileSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextProfile = await fetchStudentProfile();
      setProfile(nextProfile);
      setError(null);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Failed to load student profile.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    profile,
    isLoading,
    error,
    reload,
  };
}