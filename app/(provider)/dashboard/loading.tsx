import { WorkstationShell } from "@/components/provider/workstation-shell";
import { SkeletonBar, SkeletonCard } from "@/components/provider/skeleton";

export default function DashboardLoading() {
  return (
    <WorkstationShell active="schedule" businessName="" bleed>
      <div className="mb-5">
        <SkeletonBar className="h-7 w-52" />
        <SkeletonBar className="mt-2 h-3.5 w-40" />
      </div>
      <SkeletonBar className="mb-5 h-9 w-44 rounded-xl" />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-11">
        <div className="min-w-0 space-y-3">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-16 lg:hidden" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <SkeletonBar className="h-4 w-9 shrink-0" />
              <SkeletonCard className="h-16 flex-1" />
            </div>
          ))}
        </div>
        <div className="mt-7 hidden space-y-4 lg:mt-0 lg:block">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-28" />
        </div>
      </div>
    </WorkstationShell>
  );
}
