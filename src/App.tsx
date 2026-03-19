import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CrmProvider } from "@/context/CrmContext";
import { UserViewProvider } from "@/context/UserViewContext";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import PipelinePage from "@/pages/PipelinePage";
import DealsListPage from "@/pages/DealsListPage";
import DealDetailPage from "@/pages/DealDetailPage";
import CompaniesPage from "@/pages/CompaniesPage";
import CompanyDetailPage from "@/pages/CompanyDetailPage";
import ContactsPage from "@/pages/ContactsPage";
import ContactDetailPage from "@/pages/ContactDetailPage";
import ForecastPage from "@/pages/ForecastPage";
import NewDealPage from "@/pages/NewDealPage";
import NewActivityPage from "@/pages/NewActivityPage";
import DeletedItemsPage from "@/pages/DeletedItemsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CrmProvider>
        <UserViewProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/deals" element={<DealsListPage />} />
                <Route path="/deals/new" element={<NewDealPage />} />
                <Route path="/deals/:id" element={<DealDetailPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/companies/:id" element={<CompanyDetailPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/contacts/:id" element={<ContactDetailPage />} />
                <Route path="/forecast" element={<ForecastPage />} />
                <Route path="/activities/new" element={<NewActivityPage />} />
                <Route path="/deleted" element={<DeletedItemsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </UserViewProvider>
      </CrmProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
