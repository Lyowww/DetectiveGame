"use client";

import { useParams } from "next/navigation";
import { Workspace } from "@/components/workspace/workspace";

export default function InvestigatePage() {
  const params = useParams<{ runId: string }>();
  return <Workspace runId={params.runId} />;
}
