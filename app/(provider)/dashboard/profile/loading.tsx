import { WorkstationShell } from "@/components/provider/workstation-shell";
import { SkeletonBar, SkeletonCard } from "@/components/provider/skeleton";

export default function ProfileLoading() {
  return (
    <WorkstationShell active="profile" businessName="" bleed>
      <div className="mx-auto w-full max-w-[1100px] space-y-4 md:space-y-5">
        <SkeletonBar className="h-44 w-full rounded-[20px] sm:h-52 lg:h-60" />
        <SkeletonCard className="h-24" />
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="mt-4 h-32 lg:mt-0" />
        </div>
      </div>
    </WorkstationShell>
  );
}
