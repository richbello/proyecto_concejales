import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, HeightRule, AlignmentType } from 'docx';

interface DatosGeneracion {
  tipoProposicion: string;
  anomalia: any;
  localidad: string;
  edil: string;
  presupuestoData?: any[];
  contratacionData?: any[];
  fecha: string;
}

const P = {
  'control-presupuestal': (d: DatosGeneracion) => [
    'PROPOSICION DE CONTROL PRESUPUESTAL',
    'JUNTA ADMINISTRADORA LOCAL - ' + d.localidad.toUpperCase(),
    '',
    'Edil/Concejal: ' + d.edil,
    'Fecha: ' + d.fecha,
    'Asunto: ' + d.anomalia.titulo,
    '',
    d.edil + ', en ejercicio del derecho de peticion y conforme a los articulos 74 y 75 de la Constitucion Politica de Colombia, me permito presentar la siguiente PROPOSICION DE CONTROL PRESUPUESTAL:',
    '',
    'CONSIDERANDOS:',
    '',
    'Primero. Que, en ejercicio de las facultades de control politico establecidas en la Ley 136 de 1994, corresponde a los Ediles ejercer control sobre la administracion municipal.',
    '',
    'Segundo. Que, mediante analisis de datos publicos disponibles en SECOP II y SAP Distrital, se ha identificado la siguiente irregularidad:',
    '',
    'ANOMALIA DETECTADA:',
    '- Concepto: ' + d.anomalia.titulo,
    '- Valor: $' + (d.anomalia.monto ? d.anomalia.monto.toLocaleString('es-CO') : '0'),
    '- Fecha: ' + d.anomalia.fecha,
    '- Descripcion: ' + d.anomalia.descripcion,
    '',
    'POR LO ANTERIOR, PROPONGO:',
    '',
    '1. Solicitar al Alcalde Local informe detallado en cinco (5) dias habiles.',
    '2. Traslado al Area de Control Interno.',
    '3. Informar a la ciudadania.',
    '',
    'FUNDAMENTOS LEGALES:',
    '- Constitucion Politica de Colombia, Arts. 74-75',
    '- Ley 136 de 1994',
    '',
    'Atentamente,',
    d.edil,
  ],
  'pedir-informacion': (d: DatosGeneracion) => [
    'PETICION DE INFORMACION',
    'JUNTA ADMINISTRADORA LOCAL - ' + d.localidad.toUpperCase(),
    '',
    'Edil/Concejal: ' + d.edil,
    'Fecha: ' + d.fecha,
    '',
    d.edil + ', conforme al articulo 23 de la Constitucion Politica de Colombia, me permito presentar la siguiente PETICION DE INFORMACION:',
    '',
    'SITUACION CONSULTADA:',
    '- Descripcion: ' + d.anomalia.titulo,
    '- Valor: $' + (d.anomalia.monto ? d.anomalia.monto.toLocaleString('es-CO') : '0'),
    '',
    'PREGUNTAS FORMULADAS:',
    '1. Cual es la justificacion tecnica y financiera?',
    '2. Cuales son los documentos de soporte en SECOP II y SAP?',
    '3. Se realizo analisis de alternativas?',
    '4. Existen observaciones de entidades de control?',
    '5. Que acciones se implementaron?',
    '',
    'PETICION CONCRETA:',
    'Se solicita respuesta oficial en diez (10) dias habiles.',
    '',
    'FUNDAMENTO LEGAL:',
    '- Articulo 23, Constitucion Politica',
    '- Ley 1712 de 2014',
    '',
    'Atentamente,',
    d.edil,
  ],
  'mocion-orden-dia': (d: DatosGeneracion) => [
    'MOCION DE ORDEN DEL DIA',
    'JUNTA ADMINISTRADORA LOCAL - ' + d.localidad.toUpperCase(),
    '',
    'Edil/Concejal: ' + d.edil,
    'Fecha: ' + d.fecha,
    '',
    'TEMA PROPUESTO:',
    d.anomalia.titulo,
    'Valor: $' + (d.anomalia.monto ? d.anomalia.monto.toLocaleString('es-CO') : '0'),
    'Hallazgo: ' + d.anomalia.descripcion,
    '',
    'RAZON DE URGENCIA:',
    '1. Impacto fiscal directo sobre el presupuesto de la localidad',
    '2. Posible incumplimiento de normas de contratacion',
    '3. Necesidad de esclarecimiento publico',
    '4. Evidencia disponible en SECOP II y SAP',
    '',
    'MOCION CONCRETA:',
    'Se solicita incluir en orden del dia el tema con prioridad.',
    '',
    'Atentamente,',
    d.edil,
  ],
  'acuerdo-investigacion': (d: DatosGeneracion) => [
    'ACUERDO PARA ACTIVAR INVESTIGACION',
    'JUNTA ADMINISTRADORA LOCAL - ' + d.localidad.toUpperCase(),
    '',
    'PROYECTO DE ACUERDO',
    '',
    'ARTICULO 1: Crease una Comision Especial de Investigacion para investigar:',
    d.anomalia.titulo,
    'Valor: $' + (d.anomalia.monto ? d.anomalia.monto.toLocaleString('es-CO') : '0'),
    '',
    'ARTICULO 2: Funciones de la Comision:',
    '1. Recabar documentacion de SECOP II y SAP Distrital',
    '2. Realizar entrevistas a funcionarios',
    '3. Verificar cumplimiento de normativas',
    '4. Presentar informe con hallazgos',
    '',
    'ARTICULO 3: Plazo de treinta (30) dias calendario.',
    'ARTICULO 4: El Alcalde debe proporcionar informacion requerida.',
    'ARTICULO 5: Rige desde su aprobacion.',
    '',
    'Atentamente,',
    d.edil,
  ],
};

function celda(texto: string, ancho: number, negrita: boolean) {
  return new TableCell({
    width: { size: ancho, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: texto, bold: negrita, size: 20 })] })],
  });
}

export async function generarProposicionWord(datos: DatosGeneracion) {
  const generador = P[datos.tipoProposicion as keyof typeof P];
  const lineas = generador(datos);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'XBOG CONTROL', bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Sistema de Control Legislativo', size: 16 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ height: { value: 0, rule: HeightRule.AUTO }, children: [celda('Localidad:', 30, true), celda(datos.localidad, 70, false)] }),
            new TableRow({ height: { value: 0, rule: HeightRule.AUTO }, children: [celda('Edil/Concejal:', 30, true), celda(datos.edil, 70, false)] }),
            new TableRow({ height: { value: 0, rule: HeightRule.AUTO }, children: [celda('Fecha:', 30, true), celda(datos.fecha, 70, false)] }),
          ],
        }),
        new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: '' })] }),
        ...lineas.map((linea) => new Paragraph({ spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: linea, size: 20 })] })),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Proposicion_' + (datos.anomalia.titulo ? datos.anomalia.titulo.substring(0, 15).replace(/\s+/g, '_') : 'documento') + '.docx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
