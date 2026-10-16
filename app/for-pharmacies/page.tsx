import { createPublicInfoRoute } from "@/lib/public-info-route";
const route = createPublicInfoRoute("for-pharmacies");
export const generateMetadata = route.generateMetadata;
export default route.Page;
