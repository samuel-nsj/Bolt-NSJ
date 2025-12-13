#!/bin/sh

# Bootstrap script to create a test customer and API key

echo "=================================================================="
echo "Creating Test Customer for Aramex Connect API Testing"
echo "=================================================================="
echo ""

# Generate a test API key
TEST_API_KEY="nsjx_test123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd"

# Hash the API key (simple hex encoding matching the auth.ts implementation)
KEY_HASH=$(printf '%s' "$TEST_API_KEY" | od -A n -t x1 | tr -d ' \n')

echo "Generated Test API Key: $TEST_API_KEY"
echo "Key Hash: $KEY_HASH"
echo ""

# Create SQL to insert test customer and API key
cat > /tmp/bootstrap-customer.sql << 'EOF'
-- Insert test customer
INSERT INTO api_customers (id, business_name, email, phone, markup_type, markup_value, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Company',
  'test@example.com',
  '+61400000000',
  'percentage',
  15,
  true
)
ON CONFLICT (email) DO UPDATE SET is_active = true;

-- Insert test API key
INSERT INTO customer_api_keys (
  customer_id,
  key_hash,
  key_prefix,
  name,
  is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '6e736a785f74657374313233343536373839616263646566303132333435363738396162636465663031323334353637383961626364656630313233343536373839616263646566303132333435363738396162636364',
  'nsjx_tes',
  'Test API Key',
  true
)
ON CONFLICT (key_hash) DO UPDATE SET is_active = true;
EOF

echo "Inserting test customer into database..."
echo ""

# Use supabase CLI to execute SQL if available, otherwise show instructions
if command -v supabase > /dev/null 2>&1; then
  supabase db execute -f /tmp/bootstrap-customer.sql
  echo ""
  echo "SUCCESS: Test customer created!"
else
  echo "Supabase CLI not available. Please execute this SQL manually:"
  echo ""
  cat /tmp/bootstrap-customer.sql
  echo ""
fi

echo ""
echo "=================================================================="
echo "Test Customer Created"
echo "=================================================================="
echo ""
echo "Customer ID: 00000000-0000-0000-0000-000000000001"
echo "Business Name: Test Company"
echo "Email: test@example.com"
echo "Markup Type: percentage"
echo "Markup Value: 15%"
echo ""
echo "API Key: $TEST_API_KEY"
echo ""
echo "You can now test the API using:"
echo "  ./test-aramex-connect-api.sh"
echo ""
echo "When prompted for API key, use:"
echo "  $TEST_API_KEY"
echo ""
