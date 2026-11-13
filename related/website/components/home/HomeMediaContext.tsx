"use client";

import {createContext, useContext} from "react";

export type HomeMedia = {prepared: boolean; movies: Record<string, string>};
export const HomeMediaContext = createContext<HomeMedia | null>(null);
export const useHomeMedia = () => useContext(HomeMediaContext);
