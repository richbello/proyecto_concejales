import axios from 'axios';

export interface SisbénLocalidad {
  localidadId: string;
  localidadNombre: string;
  grupoSisbén: 'A' | 'B' | 'C' | 'D';
  totalHogares: number;
  totalPersonas: number;
}

export interface IMGBeneficiarios {
  localidadId: string;
  mes: string;
  totalHogaresBeneficiarios: number;
  totalTransferido: number;
  tasaCobro: number;
}

export const fetchSisbénData = async (localidadId: string): Promise<SisbénLocalidad[]> => {
  try {
    const query = `https://www.datos.gov.co/api/views/hq2v-5umk/rows.json?$where=municipio_codigo='05001'&$limit=1000`;
    const response = await axios.get(query);
    return response.data.map((row: any) => ({
      localidadId,
      localidadNombre: row.localidad || 'Unknown',
      grupoSisbén: row.grupo_sisben || 'A',
      totalHogares: parseInt(row.total_hogares) || 0,
      totalPersonas: parseInt(row.total_personas) || 0,
    }));
  } catch (error) {
    console.error('Error fetching SISBEN data:', error);
    return [];
  }
};

export const mockSisbénData = (): SisbénLocalidad[] => [
  {
    localidadId: '19',
    localidadNombre: 'Usme',
    grupoSisbén: 'A',
    totalHogares: 5200,
    totalPersonas: 18500,
  },
];

export const mockIMGData = (): IMGBeneficiarios[] => [
  {
    localidadId: '19',
    mes: '2026-08',
    totalHogaresBeneficiarios: 2100,
    totalTransferido: 48500000,
    tasaCobro: 92,
  },
];
