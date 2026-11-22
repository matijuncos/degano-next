'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Group, Modal, Radio, Select, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { isEqual } from 'lodash';
import { useResponsive } from '@/hooks/useResponsive';
import { arDateTimeLabel } from '@/utils/reservationRange';
import {
  defaultResolutions,
  hasDuplicateTargets,
  isChoiceValid,
  noUnitsText,
  remainingOptionsText,
  ConflictChoice,
  CandidateUnit,
  ConflictResolution,
  DateConflict
} from '@/utils/dateChangeConflicts';

// "evento actual" resaltado: que no se confunda con el otro evento
const ACTUAL = <strong>evento actual</strong>;

type Action = ConflictResolution['action'];
type Choice = ConflictChoice;

// Las opciones sobre el OTRO evento recuerdan CUÁL evento se eligió
const otherEventIdOf = (c: DateConflict, action: Action) =>
  action.endsWith('InOther') && c.busyWith.length === 1 ? c.busyWith[0].eventId : undefined;

const candidateLabel = (u: CandidateUnit) =>
  `${u.code || u.name}${u.isEquivalent ? ` · ${u.name} (equivalente)` : ''}${u.sameDay ? ' · se usa ese día' : ''}`;

const choiceOf = (r: ConflictResolution | null): Choice | null =>
  r
    ? {
        action: r.action,
        toId: 'toId' in r ? r.toId : undefined,
        otherEventId: 'otherEventId' in r ? r.otherEventId : undefined
      }
    : null;

// Lo elegido vale solo para el evento con el que se eligió (ver isChoiceValid)
const stillValid = isChoiceValid;

function toResolution(c: DateConflict, ch: Choice): ConflictResolution | null {
  const only = c.busyWith[0];
  switch (ch.action) {
    case 'replaceHere':
      return ch.toId ? { equipmentId: c.equipmentId, action: 'replaceHere', toId: ch.toId } : null;
    case 'replaceInOther':
      return ch.toId && ch.otherEventId
        ? { equipmentId: c.equipmentId, action: 'replaceInOther', otherEventId: ch.otherEventId, toId: ch.toId }
        : null;
    case 'releaseOrphan':
      return { equipmentId: c.equipmentId, action: 'releaseOrphan', orphanEventId: only.eventId };
    case 'outsourceInOther':
    case 'removeInOther':
      return ch.otherEventId ? { equipmentId: c.equipmentId, action: ch.action, otherEventId: ch.otherEventId } : null;
    default:
      return { equipmentId: c.equipmentId, action: ch.action };
  }
}

export default function DateConflictModal({
  opened,
  conflicts,
  submitting,
  error,
  onSubmit,
  onCancel
}: {
  opened: boolean;
  conflicts: DateConflict[];
  submitting: boolean;
  error: string | null;
  onSubmit: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}) {
  const { isMobile } = useResponsive();
  const [choices, setChoices] = useState<Record<string, Choice | undefined>>({});

  // Pre-elegida: la primera opción que exista. Si los choques se recalculan,
  // se conserva lo elegido que siga valiendo.
  useEffect(() => {
    setChoices((prev) => {
      const next: Record<string, Choice | undefined> = {};
      const kept = new Set<string>();
      for (const c of conflicts) {
        if (stillValid(c, prev[c.equipmentId])) {
          next[c.equipmentId] = prev[c.equipmentId];
          if (prev[c.equipmentId]?.toId) kept.add(prev[c.equipmentId]!.toId!);
        }
      }
      // El resto, en una pasada y sin repetir unidades (ni las ya conservadas)
      const without = (list: CandidateUnit[]) => list.filter((u) => !kept.has(u._id));
      const defaults = defaultResolutions(
        conflicts
          .filter((c) => !next[c.equipmentId])
          .map((c) => ({ ...c, hereCandidates: without(c.hereCandidates), otherCandidates: without(c.otherCandidates) }))
      );
      for (const [eqId, r] of Array.from(defaults.entries())) next[eqId] = choiceOf(r) ?? undefined;
      return next;
    });
  }, [conflicts]);

  // Una unidad elegida en una tarjeta no se ofrece en las demás
  const takenBy = useMemo(() => {
    const m = new Map<string, string>();
    for (const [eqId, ch] of Object.entries(choices)) if (ch?.toId) m.set(ch.toId, eqId);
    return m;
  }, [choices]);

  const resolutions = conflicts.map((c) => {
    const ch = choices[c.equipmentId];
    return ch ? toResolution(c, ch) : null;
  });
  const ready =
    resolutions.every(Boolean) && !hasDuplicateTargets(resolutions.filter(Boolean) as ConflictResolution[]);

  const setChoice = (eqId: string, ch: Choice) => setChoices((prev) => ({ ...prev, [eqId]: ch }));

  const unitSelect = (c: DateConflict, list: CandidateUnit[], action: Action) => {
    const current = choices[c.equipmentId];
    return (
      <Select
        size='xs'
        mt={4}
        ml={28}
        placeholder='Elegí la unidad'
        value={current?.action === action ? current.toId ?? null : null}
        data={list.map((u) => ({
          value: u._id,
          label: candidateLabel(u),
          disabled: takenBy.has(u._id) && takenBy.get(u._id) !== c.equipmentId
        }))}
        onChange={(v) => v && setChoice(c.equipmentId, { action, toId: v, otherEventId: otherEventIdOf(c, action) })}
        comboboxProps={{ withinPortal: true }}
        allowDeselect={false}
      />
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      fullScreen={!!isMobile}
      size='lg'
      title={<Text fw={600}>Hay equipos ocupados en las fechas nuevas</Text>}
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
    >
      <Stack gap='sm'>
        <Text size='sm' c='dimmed'>
          {conflicts.length === 1
            ? '1 equipo está reservado por otro evento en esas fechas.'
            : `${conflicts.length} equipos están reservados por otro evento en esas fechas.`}{' '}
          Elegí qué hacer con cada uno y se guarda todo junto.
        </Text>
        {error && (
          <Alert color='red' icon={<IconAlertTriangle size={16} />}>
            {error}
          </Alert>
        )}
        {conflicts.map((c) => {
          const only = c.busyWith.length === 1 ? c.busyWith[0] : null;
          const current = choices[c.equipmentId];
          const otherAllowed = !!only && !only.stale && !only.otherEventEnded;
          const otherName = only ? only.eventName || only.eventType : '';
          const keepsOwn = <>(el {ACTUAL} se queda con la suya)</>;
          const hereOptions = [
            c.hereCandidates.length > 0 && (
              <div key='replaceHere'>
                <Radio value='replaceHere' label={<>Usar otra unidad en el {ACTUAL}</>} />
                {current?.action === 'replaceHere' && unitSelect(c, c.hereCandidates, 'replaceHere')}
              </div>
            ),
            <Radio key='outsource' value='outsource' label={<>Tercerizar en el {ACTUAL}</>} />,
            <Radio key='remove' value='remove' label={<>Quitar del {ACTUAL}</>} />
          ];
          // Notas bajo la opción elegida que cambia el OTRO evento
          const otherNotes = (
            <>
              {only?.otherEventInProgress && (
                <Alert mt={6} ml={28} color='yellow' p='xs'>
                  <Text size='xs'>Ese evento está en curso: la unidad probablemente ya está allá; hay que cambiarla físicamente.</Text>
                </Alert>
              )}
              <Text size='xs' c='dimmed' ml={28} mt={4}>
                Queda un aviso en ese evento para que vuelvan a imprimir la lista.
              </Text>
            </>
          );
          const otherOptions = otherAllowed
            ? [
                c.otherCandidates.length > 0 && (
                  <div key='replaceInOther'>
                    <Radio
                      value='replaceInOther'
                      label={<>Cambiar la unidad en &quot;{otherName}&quot; {keepsOwn}</>}
                    />
                    {current?.action === 'replaceInOther' && (
                      <>
                        {unitSelect(c, c.otherCandidates, 'replaceInOther')}
                        {otherNotes}
                      </>
                    )}
                  </div>
                ),
                <div key='outsourceInOther'>
                  <Radio value='outsourceInOther' label={<>Tercerizar en &quot;{otherName}&quot; {keepsOwn}</>} />
                  {current?.action === 'outsourceInOther' && otherNotes}
                </div>,
                <div key='removeInOther'>
                  <Radio value='removeInOther' label={<>Quitar de &quot;{otherName}&quot; {keepsOwn}</>} />
                  {current?.action === 'removeInOther' && otherNotes}
                </div>
              ]
            : [];
          return (
            <Card key={c.equipmentId} withBorder padding='sm' radius='md'>
              <Group gap={6} mb={4} wrap='wrap'>
                <Text fw={600} size='sm'>
                  {c.name}
                </Text>
                {c.code && <Badge variant='light'>{c.code}</Badge>}
              </Group>
              {c.busyWith.map((b) => (
                <Text key={`${b.eventId}-${b.startDate}`} size='xs' c='dimmed'>
                  {b.stale
                    ? `Reserva sobrante de "${b.eventName || 'un evento'}" (ese evento ya no existe o ya no tiene este equipo)`
                    : `Ocupado por ${b.eventName || b.eventType}${b.location ? ` — ${b.location}` : ''} — ${arDateTimeLabel(b.startDate)} a ${arDateTimeLabel(b.endDate)}`}
                </Text>
              ))}
              {/* Por qué faltan opciones: dónde están las otras unidades del equipo */}
              {(c.hereSummary || (otherAllowed && c.otherSummary)) && (
                <Alert mt='xs' p='xs' color='gray' variant='light'>
                  <Stack gap={2}>
                    {c.hereSummary && otherAllowed && c.otherSummary && isEqual(c.hereSummary, c.otherSummary) ? (
                      // Mismo motivo en los dos eventos: una sola frase
                      <Text size='xs'>
                        No hay otra unidad de {c.name} libre ni durante el {ACTUAL} ni para cambiarla en &quot;{otherName}&quot;:{' '}
                        {noUnitsText(c.hereSummary)}
                        {c.categoryId ? ' y no hay equivalentes libres de la misma categoría' : ''}.
                      </Text>
                    ) : (
                      <>
                        {c.hereSummary && (
                          <Text size='xs'>
                            No hay otra unidad de {c.name} libre durante todo el {ACTUAL}: {noUnitsText(c.hereSummary)}
                            {c.categoryId ? ' y no hay equivalentes libres de la misma categoría' : ''}.
                          </Text>
                        )}
                        {otherAllowed && c.otherSummary && (
                          <Text size='xs'>
                            {c.hereSummary ? 'Tampoco hay' : 'No hay'} una libre para cambiarla en &quot;{otherName}&quot;:{' '}
                            {noUnitsText(c.otherSummary)}
                            {c.categoryId ? ' y no hay equivalentes libres de la misma categoría' : ''}.
                          </Text>
                        )}
                      </>
                    )}
                    {c.hereSummary && (!otherAllowed || c.otherSummary) && (
                      <Text size='xs'>{remainingOptionsText(c)}</Text>
                    )}
                  </Stack>
                </Alert>
              )}
              <Radio.Group
                mt='xs'
                value={current?.action ?? null}
                onChange={(v) => {
                  const action = v as Action;
                  const list = action === 'replaceHere' ? c.hereCandidates : action === 'replaceInOther' ? c.otherCandidates : [];
                  const first = list.find((u) => !takenBy.has(u._id) || takenBy.get(u._id) === c.equipmentId);
                  setChoice(c.equipmentId, {
                    action,
                    toId: list.length ? first?._id : undefined,
                    otherEventId: otherEventIdOf(c, action)
                  });
                }}
              >
                <Stack gap={6}>
                  {only?.stale && (
                    <Radio
                      value='releaseOrphan'
                      label={<>Liberar la reserva sobrante (el {ACTUAL} se queda con la unidad)</>}
                    />
                  )}
                  {/* Si el otro evento empieza después, sus opciones van primero (logística) */}
                  {only?.otherStartsLater ? [...otherOptions, ...hereOptions] : [...hereOptions, ...otherOptions]}
                </Stack>
              </Radio.Group>
            </Card>
          );
        })}
        <Group justify='flex-end' gap='sm' mt='xs'>
          <Button variant='default' onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSubmit(resolutions.filter(Boolean) as ConflictResolution[])}
            disabled={!ready}
            loading={submitting}
          >
            Guardar cambios
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
