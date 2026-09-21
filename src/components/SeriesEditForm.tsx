"use client";

import {
    createContext,
    useContext,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

type SeriesEditFormContextValue = {
    isUploading: boolean;
    setIsUploading: (isUploading: boolean) => void;
};

type SeriesEditFormProps = {
    action: (formData: FormData) => void | Promise<void>;
    children: ReactNode;
    className?: string;
};

const SeriesEditFormContext = createContext<SeriesEditFormContextValue | null>(null);

function useSeriesEditFormContext() {
    const context = useContext(SeriesEditFormContext);

    if (!context) {
        throw new Error("Series edit controls must be rendered inside SeriesEditForm.");
    }

    return context;
}

export function SeriesEditForm({
    action,
    children,
    className,
}: SeriesEditFormProps) {
    const [isUploading, setIsUploading] = useState(false);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        if (isUploading) {
            event.preventDefault();
        }
    }

    return (
        <SeriesEditFormContext.Provider value={{ isUploading, setIsUploading }}>
            <form action={action} onSubmit={handleSubmit} className={className}>
                {children}
            </form>
        </SeriesEditFormContext.Provider>
    );
}

export function useSeriesImageUploadState() {
    return useSeriesEditFormContext();
}

export function SeriesSaveButton() {
    const { isUploading } = useSeriesEditFormContext();
    const { pending } = useFormStatus();
    const isDisabled = isUploading || pending;

    return (
        <button
            type="submit"
            disabled={isDisabled}
            className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
        >
            {isUploading ? "上传封面中…" : pending ? "保存中…" : "保存系列"}
        </button>
    );
}
