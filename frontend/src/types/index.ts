export interface ServiceOut {
    id: string;
    master_id: string;
    name: string;
    description?: string;
    price: number;
    duration_min: number;
    created_at: string;
}

export interface ScheduleOut {
    id: string;
    master_id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    created_at: string;
}

export interface BookingOut {
    id: string;
    client_id?: string;
    master_id: string;
    service_id: string;
    schedule_id: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    notes?: string;
    prepayment_amount: number;
    confirmed_at?: string;
    completed_at?: string;
    created_at: string;
}

// --- Добавленные типы для Profile ---
export interface ProfileOut {
    id: string;
    user_id: string;
    bio?: string;
    slug?: string;
    rating_avg: number;
    total_reviews: number;
    total_stars_received: number;
    top_position?: number;
    wishes: Record<string, any>; // JSONb
    visit_history: Record<string, any>[]; // JSONb
    created_at: string;
    updated_at?: string;
}

export interface ReviewOut {
    id: string;
    from_user_id: string;
    to_user_id: string;
    rating: number;
    comment?: string;
    is_master_review: boolean;
    created_at: string;
}

export interface StarOut {
    id: string;
    from_client_id: string;
    to_master_id: string;
    amount: number;
    is_free: boolean;
    purchased_at?: string;
    used_at?: string;
    created_at: string;
}

export interface TopOut {
    id: string;
    master_id: string;
    city: string;
    position: number;
    score: number;
    updated_at: string;
}

export interface VisitPhotoOut {
    id: string;
    booking_id: string;
    client_id: string;
    image_url: string;
    comment?: string;
    visibility: "private" | "masters" | "public";
    uploaded_at: string;
}

export interface PortfolioItemOut {
    id: string;
    owner_id: string;
    service_id?: string;
    image_url: string;
    caption?: string;
    tags: string[];
    likes: number;
    created_at: string;
}
// --- Конец добавленных типов ---
