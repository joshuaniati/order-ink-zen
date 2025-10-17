-- Create shops table
CREATE TABLE public.shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create supplies table
CREATE TABLE public.supplies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  phone_number TEXT NOT NULL,
  shop TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supply_id UUID REFERENCES public.supplies(id) ON DELETE CASCADE,
  supply_name TEXT NOT NULL,
  order_date DATE NOT NULL,
  ordered_by TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_delivered DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Partial', 'Delivered')),
  shop TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create income_records table with 4 specific fields
CREATE TABLE public.income_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  shop TEXT NOT NULL,
  cash_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  card_machine_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  account_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  direct_deposit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  daily_income DECIMAL(10, 2) NOT NULL DEFAULT 0,
  expenses DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_income DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create weekly_budgets table
CREATE TABLE public.weekly_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  budget_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(shop, week_start_date)
);

-- Enable RLS on all tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (adjust based on your security needs)
CREATE POLICY "Allow all operations on shops" ON public.shops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on supplies" ON public.supplies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on income_records" ON public.income_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weekly_budgets" ON public.weekly_budgets FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for income_records
CREATE TRIGGER update_income_records_updated_at
  BEFORE UPDATE ON public.income_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();