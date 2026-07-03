import { WorkstationShell } from "@/components/provider/workstation-shell";
import { SkeletonBar, SkeletonCard } from "@/components/provider/skeleton";

export default function SettingsLoading() {
  return (
    <WorkstationShell active="settings" businessName="" maxWidth="600px">
      <SkeletonBar className="h-7 w-40" />
      <SkeletonBar className="mt-2.5 h-3.5 w-80" />

      <div className="mt-7 space-y-2.5">
        <SkeletonBar className="h-5 w-48" />
        <SkeletonCard className="h-16" />
        <SkeletonCard className="h-16" />
      </div>

      <div className="mt-8 space-y-2.5">
        <SkeletonBar className="h-5 w-40" />
        <SkeletonCard className="h-44" />
      </div>

      <div className="mt-8 space-y-2.5">
        <SkeletonBar className="h-5 w-36" />
        <SkeletonCard className="h-52" />
      </div>
    </WorkstationShell>
  );
}
