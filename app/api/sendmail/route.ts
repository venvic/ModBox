import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    const { emailHTML, activeRecipients, emailTitle } = await req.json();

    const transporter = nodemailer.createTransport({
        host: process.env.NEXT_PUBLIC_SMTP_HOST,
        port: parseInt(process.env.NEXT_PUBLIC_SMTP_PORT || '587', 10),
        auth: {
            user: process.env.NEXT_PUBLIC_SMTP_USER,
            pass: process.env.NEXT_PUBLIC_SMTP_PASS
        },
        from: process.env.NEXT_PUBLIC_SMTP_FROM,
        secure: false,
        name: 'cosmema.de',
        tls: {
            rejectUnauthorized: false,
        },
    });

    const mailOptions = {
        from: process.env.NEXT_PUBLIC_SMTP_FROM,
        to: activeRecipients,
        subject: `Neue Formularanfrage: ${emailTitle}`,
        html: emailHTML,
    };

    try {
        await transporter.sendMail(mailOptions);
        return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });
    } catch (error: any) {
        console.error('Failed to send email:', error);
        console.error('Error details:', error.response || error.message);
        return NextResponse.json({ message: 'Failed to send email', error: error.message }, { status: 500 });
    }
}