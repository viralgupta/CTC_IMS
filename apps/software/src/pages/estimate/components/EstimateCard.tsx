import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { CircleUserRound, Trash2 } from "lucide-react";
import DivButton from "@/components/ui/div-button";
import { useSetRecoilState } from "recoil";
import { viewCustomerIDAtom } from "@/store/Customer";
import EditEstimate from "./EditEstimate";
import {
  viewEstimateAtom,
  viewEstimateIdAtom,
  ViewEstimateType,
} from "@/store/estimates";
import { parseDateToString } from "@/lib/utils";
import DeleteAlert from "@/components/DeleteAlert";
import { Button } from "@/components/ui/button";
import { useAllEstimates } from "@/hooks/estimate";

const EstimateCard = ({ estimate }: { estimate: ViewEstimateType | null }) => {
  const setViewCustomerID = useSetRecoilState(viewCustomerIDAtom);
  const { refetchEstimates } = useAllEstimates();

  if (!estimate) return <Skeleton className="w-full h-96" />;
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="text-2xl font-bold mb-4 flex justify-between">
          Estimate Details
        </div>
        <div className="flex gap-2 mb-2">
          <DivButton
            onClick={() => {
              setViewCustomerID(estimate.customer_id ?? "");
            }}
            className="flex items-center space-x-4 w-1/2 px-2 py-1"
          >
            <Avatar>
              <AvatarImage src={estimate.customer?.profileUrl ?? undefined} />
              <AvatarFallback>
                <CircleUserRound className="w-10 h-10 stroke-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">
                {estimate.customer?.name ?? "No Customer Assigned"}
              </p>
              {estimate.customer && (
                <p className="text-sm text-muted-foreground">
                  {estimate.customer?.phone_numbers[0].country_code}{" "}
                  {estimate.customer?.phone_numbers[0].phone_number}
                </p>
              )}
              {estimate.customer && (
                <p className="text-sm">
                  Balance: ₹{estimate.customer?.balance ?? "0.00"}
                </p>
              )}
            </div>
          </DivButton>
          <DivButton className="flex flex-col w-1/2 px-2 hover:bg-background cursor-default">
            <div className="text-xl font-sofiapro">
              Total Estimate Amount: ₹{estimate.total_estimate_amount}
            </div>
            <div className="font-sofiapro text-foreground/70">
              Created At: {parseDateToString(estimate.created_at)}
            </div>
            <div className="font-sofiapro text-foreground/70">
              Updated At: {parseDateToString(estimate.updated_at)}
            </div>
          </DivButton>
        </div>
        <div className="gap-2 flex w-full">
          <EditEstimate />
          <DeleteAlert
            refetchFunction={refetchEstimates}
            type="estimate"
            viewObjectAtom={viewEstimateAtom}
            viewObjectIdAtom={viewEstimateIdAtom}
          >
            <Button variant={"outline"} className="gap-2 w-1/2">
              <Trash2 />
              Delete Estimate
            </Button>
          </DeleteAlert>
        </div>
      </CardContent>
    </Card>
  );
};

export default EstimateCard;
