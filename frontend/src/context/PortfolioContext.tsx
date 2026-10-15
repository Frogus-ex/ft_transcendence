import { createContext, useContext, useState } from "react";
import { mockPortfolio, mockOrders, mockStats } from "../data/mockPortfolio"

type PortfolioContextValue = {
    portfolio: typeof mockPortfolio;
    orders: typeof mockOrders;
    stats: typeof mockStats;
};

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

export function PortfolioProvider({ children }: {children: React.ReactNode}) {
    return (
        <PortfolioContext.Provider value={{ portfolio: mockPortfolio, orders: mockOrders, stats: mockStats}}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (context == undefined){
        throw new Error("usePortfolio doit etre utilise a l'interieur d'un <PorfolioProvider>");
    }
    return context;
}