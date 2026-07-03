import { WorkstationShell } from "@/components/provider/workstation-shell";
import { SkeletonBar, SkeletonCard } from "@/components/provider/skeleton";

export default function ClientsLoading() {
  return (
    <WorkstationShell active="clients" businessName="" bleed>
      <div className="md:mx-auto md:min-h-[560px] md:max-w-[980px] md:overflow-hidden md:rounded-2xl md:border md:border-line md:bg-surface md:grid md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2.5 md:border-r md:border-line md:p-[18px]">
          <SkeletonBar className="h-10 w-full rounded-xl" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl border border-line p-2.5">
              <SkeletonBar className="h-[34px] w-[34px] rounded-full" />
              <div className="flex-1">
                <SkeletonBar className="h-3.5 w-24" />
                <SkeletonBar className="mt-1.5 h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden min-w-0 md:block md:p-7">
          <div className="flex items-center gap-3.5">
            <SkeletonBar className="h-[54px] w-[54px] rounded-full" />
            <div className="flex-1">
              <SkeletonBar className="h-6 w-40" />
              <SkeletonBar className="mt-2 h-3 w-52" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <SkeletonCard className="h-20" />
            <SkeletonCard className="h-20" />
            <SkeletonCard className="h-20" />
          </div>
          <div className="mt-7 space-y-2">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} className="h-14" />
            ))}
          </div>
        </div>
      </div>
    </WorkstationShell>
  );
}
