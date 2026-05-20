import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  FleetOverview, FleetDevice, DeviceDetail, FleetAlert,
  OTACampaign, AssignDeviceInput, ReturnDeviceInput, DeviceStatus,
} from '@/types/common'

export function useFleetOverview() {
  return useQuery({
    queryKey: ['fleet', 'overview'],
    queryFn: () => api.get<FleetOverview>('/fleet/overview'),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useFleetDevices() {
  return useQuery({
    queryKey: ['fleet', 'devices'],
    queryFn: () => api.get<FleetDevice[]>('/fleet/devices'),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useDeviceDetail(deviceId: string | null) {
  return useQuery({
    queryKey: ['fleet', 'device', deviceId],
    queryFn: () => api.get<DeviceDetail>(`/fleet/devices/${deviceId}`),
    enabled: !!deviceId,
    staleTime: 30 * 1000,
  })
}

export function useFleetAlerts() {
  return useQuery({
    queryKey: ['fleet', 'alerts'],
    queryFn: () => api.get<FleetAlert[]>('/fleet/alerts'),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useOTACampaigns() {
  return useQuery({
    queryKey: ['fleet', 'ota'],
    queryFn: () => api.get<OTACampaign[]>('/fleet/ota/campaigns'),
    staleTime: 60 * 1000,
  })
}

export function useUpdateDeviceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, status }: { deviceId: string; status: DeviceStatus }) =>
      api.put<{ success: boolean }>(`/fleet/devices/${deviceId}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fleet'] })
    },
  })
}

export function useMarkDeviceLost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) =>
      api.put<{ success: boolean }>(`/fleet/devices/${deviceId}/mark-lost`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fleet'] })
    },
  })
}

export function useAssignDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, data }: { deviceId: string; data: AssignDeviceInput }) =>
      api.put<{ success: boolean }>(`/fleet/devices/${deviceId}/assign`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fleet'] })
    },
  })
}

export function useReturnDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, data }: { deviceId: string; data: ReturnDeviceInput }) =>
      api.post<{ success: boolean }>(`/fleet/devices/${deviceId}/return`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fleet'] })
    },
  })
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (alertId: string) =>
      api.put<{ success: boolean }>(`/fleet/alerts/${alertId}/acknowledge`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fleet'] })
    },
  })
}

export function useLaunchOTA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ targetFirmware, deviceIds }: { targetFirmware: string; deviceIds: string[] }) =>
      api.post<OTACampaign>('/fleet/ota/push', { target_firmware: targetFirmware, device_ids: deviceIds }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fleet'] })
    },
  })
}
