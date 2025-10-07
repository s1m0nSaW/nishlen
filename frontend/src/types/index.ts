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
