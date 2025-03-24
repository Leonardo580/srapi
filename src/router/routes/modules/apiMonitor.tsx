import { Suspense, lazy } from "react";
import { Navigate, Outlet } from "react-router";

import { SvgIcon } from "@/components/icon";
import { CircleLoading } from "@/components/loading";

import type { AppRouteObject } from "#/router";

const APIMonitor = lazy(() => import("@/pages/apiMonitor"));
const dashboard: AppRouteObject = {
	order: 1,
	path: "dashboard",
	element: (
		<Suspense fallback={<CircleLoading />}>
			<Outlet />
		</Suspense>
	),
	meta: {
		label: "sys.menu.dashboard",
		icon: <SvgIcon icon="ic-analysis" className="ant-menu-item-icon" size="24" />,
		key: "/dashboard",
	},
	children: [
		{
			index: true,
			element: <Navigate to="apiMonitor" replace />,
		},
		{
			path: "apiMonitor",
			element: <APIMonitor />,
			meta: { label: "api monitor", key: "/apiMonitor/" },
		},
	],
};

export default dashboard;
