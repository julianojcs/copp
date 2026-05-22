/**
 * Estados brasileiros — dados baseados na API do IBGE
 * (https://servicodados.ibge.gov.br/api/v1/localidades/estados)
 *
 * Mapa estático para uso em validação e renderização síncrona.
 * Sigla (UF) → Nome completo do estado.
 */
export const BRAZILIAN_STATES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
}

export const VALID_UFS = new Set(Object.keys(BRAZILIAN_STATES))

export function getStateName(uf: string): string | undefined {
  return BRAZILIAN_STATES[uf.toUpperCase().trim()]
}
