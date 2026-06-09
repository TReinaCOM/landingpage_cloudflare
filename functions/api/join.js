export async function onRequestPost(context) {
    const { env, request } = context;

    const corsHeaders = {
        'Content-Type': 'application/json',
    };

    try {
        // Lê os dados JSON enviados pelo setup do index.html
        const data = await request.json();
        const { name, email, message, role, city, postal_code } = data;

        if (!name || !email || !role) {
            return new Response(JSON.stringify({ error: 'Nome, email e o perfil são obrigatórios' }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // 1. Inserir na base de dados D1
        const stmt = env.DB.prepare(
            'INSERT INTO contacts (name, email, message, role, city, postal_code) VALUES (?, ?, ?, ?, ?, ?)'
        );
        await stmt.bind(name, email, message, role, city, postal_code).run();

        // 2. Enviar notificação pelo Resend (Obrigatório configurar RESEND_API_KEY na Cloudflare)
        if (env.RESEND_API_KEY) {
            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'THE FITNESS PROJECT <onboarding@resend.dev>',
                        to: 'lino@treinacom.pt',
                        subject: '🔥 Novo Inscrito na Lista!',
                        html: `<h3>Nova lead recebida!</h3>
                   <p><strong>Nome:</strong> ${name}</p>
                   <p><strong>Email:</strong> ${email}</p>
                   <p><strong>Telefone/Mensagem:</strong> ${message}</p>
                   <p><strong>Perfil:</strong> ${role}</p>
                   <p><strong>Cidade:</strong> ${city || 'Não informado'}</p>
                   <p><strong>Código Postal:</strong> ${postal_code || 'Não informado'}</p>`
                    }),
                });
            } catch (emailError) {
                console.error('Erro ao enviar email:', emailError);
                // Não bloqueamos o sucesso se apenas o email falhar, mas o D1 gravou
            }
        }

        // 3. Enviar dados para o Webhook do n8n (Mautic + Stalwart)
        try {
            // Por defeito usa a URL de produção. Você pode definir a env.N8N_WEBHOOK_URL para a de teste se preferir.
            const n8nWebhookUrl = env.N8N_WEBHOOK_URL || 'https://n8n.digital2fit.com/webhook-test/thefitnessproject';

            await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    message: message,
                    role: role,
                    city: city || '',
                    postal_code: postal_code || ''
                })
            });
        } catch (n8nError) {
            console.error('Erro ao enviar para o n8n:', n8nError);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: corsHeaders
        });

    } catch (err) {
        console.error('Worker Error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}