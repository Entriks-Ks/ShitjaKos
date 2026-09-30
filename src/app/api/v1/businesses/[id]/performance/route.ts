import { apiActor } from "@/app/api/v1/_shared/access";
import { endpoint, paramsOf } from "@/app/api/v1/_shared/http";
import { ApiError } from "@/app/api/v1/_shared/input";
import {
  getBusinessPerformance,
  PerformanceError,
} from "@/services/business-performance";
export const dynamic = "force-dynamic";
export const GET = endpoint(async (request, context) => {
  const actor = await apiActor(request);
  try {
    return await getBusinessPerformance(
      actor,
      (await paramsOf(context)).id,
      Object.fromEntries(new URL(request.url).searchParams),
    );
  } catch (error) {
    if (error instanceof PerformanceError)
      throw new ApiError(error.status, error.message);
    throw error;
  }
});
