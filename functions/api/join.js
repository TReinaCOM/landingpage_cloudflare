// Dentro da sua função onRequestPost
await fetch('https://api.resend.com', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        from: 'Waitlist <onboarding@resend.dev>', // Nome que aparece no remetente
        to: 'oseuemail@exemplo.com',             // O seu email pessoal
        subject: 'Novo Inscrito!',
        html: `<strong>Sucesso!</strong> O email ${email} acabou de entrar na lista.`
    }),
});