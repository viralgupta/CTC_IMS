import { viewAllLogAtom, viewLogButtonAtom, viewLogButtonType } from "@/store/log";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import request from "@/lib/request";
import { Eye } from "lucide-react";
import { Button } from "../ui/button";
import { convertTypeToHeading, parseDateToString } from "@/lib/utils";
import { useRecoilState } from "recoil";
import { Skeleton } from "../ui/skeleton";
import ViewLog from "./ViewLog";
import { useVirtualizer } from "@tanstack/react-virtual";

const ViewAllLogs = () => {
  const [viewLogButton, setViewLogButton] = useRecoilState(viewLogButtonAtom);
  const [viewAllLogs, setViewAllLogs] = useRecoilState(viewAllLogAtom);
  const [open, setOpen] = React.useState(false);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: (viewAllLogs ?? []).length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 2,
  });

  React.useEffect(() => {
    if (viewLogButton) {
      setOpen(true);
        const queryParams = new URLSearchParams();
      if (viewLogButton.type) {
        Object.entries(viewLogButton.type).forEach(([key, value]) => {
          if (value) {
            queryParams.append(key, value.toString());
          }
        });
      } else {
        if (viewLogButton.linked_to) {
          queryParams.append("linked_to", viewLogButton.linked_to);
        }
      }

      request
        .get(`/miscellaneous/getLog?${queryParams.toString()}`)
        .then((res) => {
          setViewAllLogs(res.data.data);
        });
    }
  }, [viewLogButton]);

  function convertObjectToKey(logType: viewLogButtonType["type"]) {
    if (!logType) return "";
    Object.entries(logType).forEach(([_key, value]) => {
      return value;
    });
  }

  return (
    <Dialog
      key={viewLogButton?.linked_to ? viewLogButton.linked_to : convertObjectToKey(viewLogButton?.type)}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setViewLogButton(null);
          setViewAllLogs(null);
        }
      }}
    >
      <DialogContent size="5xl">
        <DialogHeader>
          <DialogTitle>View All Logs</DialogTitle>
          <DialogDescription className="hidden"></DialogDescription>
        </DialogHeader>
        {viewAllLogs ? (
          <div
            ref={parentRef}
            className="overflow-y-auto hide-scroll w-full max-h-96"
          >
            <Table
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              <TableCaption>A list of recent logs.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Heading</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Linked To</TableHead>
                  <TableHead className="text-center">User</TableHead>
                  <TableHead className="text-center">Created At</TableHead>
                  <TableHead className="text-center">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewAllLogs &&
                  virtualizer.getVirtualItems().map((virtualRow, index) => {
                    const log = viewAllLogs[virtualRow.index];
                    return (
                      <TableRow key={log.id}
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${
                            virtualRow.start - index * virtualRow.size
                          }px)`,
                        }}
                      >
                        <TableCell className="text-center">
                          {log.heading
                            ? log.heading
                            : convertTypeToHeading(log.type, log.linked_to)}
                        </TableCell>
                        <TableCell className="text-center">{log.type}</TableCell>
                        <TableCell className="text-center">
                          {log.linked_to}
                        </TableCell>
                        <TableCell className="text-center">
                          {log.user.name}
                        </TableCell>
                        <TableCell className="text-center">
                          {parseDateToString(log.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <ViewLog logId={log.id}>
                            <Button>
                              <Eye />
                            </Button>
                          </ViewLog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Skeleton className="w-full h-96" />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewAllLogs;
