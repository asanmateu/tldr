import { useEffect, useState } from "react";
import pkg from "../../package.json";
import type { UpdateCheckResult } from "../lib/updateCheck.js";
import { checkForUpdate } from "../lib/updateCheck.js";

export function useUpdateCheck(): UpdateCheckResult | null {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);

  useEffect(() => {
    checkForUpdate(pkg.version).then((r) => {
      if (r) setResult(r);
    });
  }, []);

  return result;
}
