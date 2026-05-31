export declare function LoadingSpinner({ className }: {
    className?: string;
}): import("react").JSX.Element;
export declare function EmptyState({ message, icon, className, action, }: {
    message?: string;
    icon?: string;
    className?: string;
    action?: React.ReactNode;
}): import("react").JSX.Element;
export declare function Modal({ isOpen, onClose, title, children, size, }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}): import("react").JSX.Element | null;
export declare function PageHeader({ title, subtitle, actions, }: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}): import("react").JSX.Element;
export declare function Pagination({ page, totalPages, onPageChange, total, limit, }: {
    page: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    total: number;
    limit: number;
}): import("react").JSX.Element | null;
export declare function StockTypeBadge({ type }: {
    type: string;
}): import("react").JSX.Element;
//# sourceMappingURL=index.d.ts.map