export async function onRequestPost(context) {
    const { env, request } = context;

    const corsHeaders = {
        'Content-Type': 'application/json',
    };

    try {
        // Lê os dados JSON enviados pelo setup do index.html
        const data = await request.json();
        const { name, email, message } = data;

        if (!name || !email) {
            return new Response(JSON.stringify({ error: 'Nome e email são obrigatórios' }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // 1. Inserir na base de dados D1
        // Usando a tabela 'contacts' conforme o seu último exemplo
        const stmt = env.DB.prepare(
            'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)'
        );
        await stmt.bind(name, email, message).run();

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
                   <p><strong>Telefone/Mensagem:</strong> ${message}</p>`
                    }),
                });
            } catch (emailError) {
                console.error('Erro ao enviar email:', emailError);
                // Não bloqueamos o sucesso se apenas o email falhar, mas o D1 gravou
            }
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