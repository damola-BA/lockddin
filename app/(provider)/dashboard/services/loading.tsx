import { WorkstationShell } from "@/components/provider/workstation-shell";
import { SkeletonBar } from "@/components/provider/skeleton";

export default function ServicesLoading() {
  return (
    <WorkstationShell active="services" businessName="" bleed>
      <div className="mx-auto w-full max-w-[1040px]">
        <div className="mb-5 flex items-end justify-between gap-3.5">
          <div>
            <SkeletonBar className="h-7 w-40" />
            <SkeletonBar className="mt-2 h-3.5 w-72" />
          </div>
          <SkeletonBar className="h-9 w-24 rounded-[9px]" />
        </div>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="overflow-hidden rounded-[18px] border border-line bg-surface">
              <SkeletonBar className="h-[122px] rounded-none" />
              <div className="px-4 pb-[15px] pt-3.5">
                <SkeletonBar className="h-4 w-28" />
                <SkeletonBar className="mt-2 h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkstationShell>
  );
}
