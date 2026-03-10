import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchDefinitions,
  forkDefinition,
  deleteDefinition,
  type ProgramDefinitionResponse,
} from '@/lib/api-functions';

export interface UseDefinitionsReturn {
  readonly definitions: readonly ProgramDefinitionResponse[];
  readonly isLoading: boolean;
  readonly fork: (sourceId: string, sourceType: 'template' | 'definition') => void;
  readonly forkAsync: (
    sourceId: string,
    sourceType: 'template' | 'definition'
  ) => Promise<ProgramDefinitionResponse>;
  readonly isForking: boolean;
  readonly deleteDefinition: (id: string) => void;
  readonly isDeleting: boolean;
}

export function useDefinitions(): UseDefinitionsReturn {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.definitions.list(),
    queryFn: async () => {
      const result = await fetchDefinitions(0, 100);
      return result.data;
    },
    staleTime: 30_000,
  });

  const forkMutation = useMutation({
    mutationFn: async ({
      sourceId,
      sourceType,
    }: {
      readonly sourceId: string;
      readonly sourceType: 'template' | 'definition';
    }) => forkDefinition(sourceId, sourceType),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.definitions.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteDefinition(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.definitions.all });
    },
  });

  const forkCb = (sourceId: string, sourceType: 'template' | 'definition'): void => {
    forkMutation.mutate({ sourceId, sourceType });
  };

  const forkAsyncCb = async (
    sourceId: string,
    sourceType: 'template' | 'definition'
  ): Promise<ProgramDefinitionResponse> => {
    return forkMutation.mutateAsync({ sourceId, sourceType });
  };

  const deleteCb = (id: string): void => {
    deleteMutation.mutate(id);
  };

  return {
    definitions: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    fork: forkCb,
    forkAsync: forkAsyncCb,
    isForking: forkMutation.isPending,
    deleteDefinition: deleteCb,
    isDeleting: deleteMutation.isPending,
  };
}
