UPDATE payment_gateways 
SET 
    api_key = '11d953defe3248c1983e976a35b300bc', 
    private_key = 'c8355b6cfd4a8f3f690c9b64',
    webhook_url = 'https://7a65-2404-c0-a702-dfec-444d-76a8-fc4e-14f3.ngrok-free.app/api/prismalink/webhook',
    is_active = true
WHERE name = 'Prismalink';
