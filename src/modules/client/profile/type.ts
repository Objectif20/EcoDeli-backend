export interface User {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    photo: string | null;
    active: boolean;
    language: string;
    iso_code: string;
    profile: string[];
    otp?: boolean | false;
    updgradablePlan?: boolean | false;
    planName?: string;
    validateProfile?: boolean | false;
  }


  export interface BillingsData {
    billings :  {
        id: string
        date: string
        type: "auto" | "not-auto",
        amount: number
        invoiceLink: string
    }[],
    amount : number
  }

export interface UserSubscriptionData {
  history : {
    id: string
    month: string
    status: "ok" | "wait" | "cancelled"
    name : string
    invoiceLink: string
    customer_stripe_id: boolean
  }[]
    plan : {
      plan_id: number;
      name: string;
      price: string;
      priority_shipping_percentage: string;
      priority_months_offered: number;
      max_insurance_coverage: string;
      extra_insurance_price: string;
      shipping_discount: string;
      permanent_discount: string;
      permanent_discount_percentage: string;
      small_package_permanent_discount: string;
      first_shipping_free: boolean;
      first_shipping_free_threshold: string;
      is_pro: boolean;
  }
}