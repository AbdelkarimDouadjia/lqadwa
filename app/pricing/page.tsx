import { createPublicInfoRoute } from "@/lib/public-info-route";
const route = createPublicInfoRoute("pricing");
export const generateMetadata = route.generateMetadata;
export default route.Page;
