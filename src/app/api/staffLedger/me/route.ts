// src/app/api/staffLedger/me/route.ts
// "Mis cobros": la cuenta del empleado logueado, resuelto por email.
// Nunca acepta un employeeId del cliente. La imputación se calcula sobre toda
// la historia (si no, el estado de cada línea sería incorrecto) y DESPUÉS se
// recorta a la ventana: 3 meses atrás, 1 mes adelante. El total futuro y el
// histórico completo son solo para admin.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/withAuth';
import { resolveEmployee, RESOLVE_MESSAGES } from '@/lib/resolveEmployee';
import { getDb, ensureLedgerIndexes, loadAccount } from '@/lib/staffLedgerServer';
import { employeeWindow, inWindow } from '@/utils/staffLedger';
import { isLedgerEligible } from '@/utils/staffLedgerInput';

export const GET = withAuth(async (ctx: AuthContext) => {
  try {
    const db = await getDb();
    const result = await resolveEmployee(db, ctx.user);
    if (!result.ok) {
      return NextResponse.json({ linked: false, message: RESOLVE_MESSAGES[result.reason] });
    }
    // Entrada de directorio (isStaff:false): entró a la app pero no es STAFF
    if (!isLedgerEligible(result.employee)) {
      return NextResponse.json({ linked: false, message: RESOLVE_MESSAGES.not_linked });
    }

    await ensureLedgerIndexes(db);
    const employee: any = result.employee;
    const employeeId = String(employee._id);
    const now = new Date();
    const account = await loadAccount(db, employeeId, now);
    const window = employeeWindow(now);
    const charges = account.charges.filter((c) => inWindow(c.date, window));

    return NextResponse.json({
      linked: true,
      employeeId,
      fullName: employee.fullName || '',
      charges,
      credits: account.credits.filter((c) => inWindow(c.date, window)),
      summary: {
        // Lo pendiente es SU plata: incluye deudas viejas fuera de la ventana
        pendingToDate: account.summary.pendingToDate,
        favor: account.summary.favor,
        nextMonthTotal: account.summary.nextMonthTotal,
        missingAmount: charges.filter((c) => c.amount == null).length
      },
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      policy: employee.insurancePolicy ? { fileName: employee.insurancePolicy.fileName } : null
    });
  } catch (error) {
    console.error('[staffLedger/me GET]', error);
    return NextResponse.json({ error: 'Error al obtener tus cobros' }, { status: 500 });
  }
});
