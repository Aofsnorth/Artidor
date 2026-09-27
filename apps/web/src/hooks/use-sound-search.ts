import { useEffect } from "react";
import { useSoundsStore } from "@/stores/sounds-store";
import { useSession } from "@/lib/auth/client";
import { useShallow } from "zustand/shallow";

export function useSoundSearch({
	query,
	commercialOnly,
}: {
	query: string;
	commercialOnly: boolean;
}) {
	// The sounds API is auth-gated; signed out, a search can only 401. Resolve
	// the session first so the doomed request is never fired.
	const { data: sessionData } = useSession();
	const signedIn = Boolean(sessionData?.user);
	// useShallow: the whole-store destructure previously returned a fresh
	// object every call, re-rendering the search view on ANY sounds-store
	// change (scroll position, pagination counters) — including mid-keystroke
	// while this hook's own debounce timer is pending.
	const {
		searchResults,
		isSearching,
		searchError,
		lastSearchQuery,
		currentPage,
		hasNextPage,
		isLoadingMore,
		totalCount,
		setSearchResults,
		setSearching,
		setSearchError,
		setLastSearchQuery,
		setCurrentPage,
		setHasNextPage,
		setTotalCount,
		setLoadingMore,
		appendSearchResults,
		appendTopSounds,
		resetPagination,
	} = useSoundsStore(
		useShallow((s) => ({
			searchResults: s.searchResults,
			isSearching: s.isSearching,
			searchError: s.searchError,
			lastSearchQuery: s.lastSearchQuery,
			currentPage: s.currentPage,
			hasNextPage: s.hasNextPage,
			isLoadingMore: s.isLoadingMore,
			totalCount: s.totalCount,
			setSearchResults: s.setSearchResults,
			setSearching: s.setSearching,
			setSearchError: s.setSearchError,
			setLastSearchQuery: s.setLastSearchQuery,
			setCurrentPage: s.setCurrentPage,
			setHasNextPage: s.setHasNextPage,
			setTotalCount: s.setTotalCount,
			setLoadingMore: s.setLoadingMore,
			appendSearchResults: s.appendSearchResults,
			appendTopSounds: s.appendTopSounds,
			resetPagination: s.resetPagination,
		})),
	);

	const loadMore = async () => {
		if (!signedIn || isLoadingMore || !hasNextPage) return;

		try {
			setLoadingMore({ loading: true });
			const nextPage = currentPage + 1;

			const searchParams = new URLSearchParams({
				page: nextPage.toString(),
				type: "effects",
			});

			if (query.trim()) {
				searchParams.set("q", query);
			}

			searchParams.set("commercial_only", commercialOnly.toString());
			const response = await fetch(
				`/api/sounds/search?${searchParams.toString()}`,
			);

			if (response.status === 401) {
				setHasNextPage({ hasNext: false });
				return;
			}

			if (!response.ok) {
				setSearchError({ error: `Load more failed: ${response.status}` });
				return;
			}

			const data = await response.json();
			if (query.trim()) {
				appendSearchResults(data.results);
			} else {
				appendTopSounds(data.results);
			}

			setCurrentPage({ page: nextPage });
			setHasNextPage({ hasNext: !!data.next });
			setTotalCount({ count: data.count });
		} catch (err) {
			setSearchError({
				error: err instanceof Error ? err.message : "Load more failed",
			});
		} finally {
			setLoadingMore({ loading: false });
		}
	};

	useEffect(() => {
		if (!signedIn) {
			// Signed out: no request, no 401 — the view renders its auth state.
			setSearchResults({ results: [] });
			setSearchError({ error: null });
			setHasNextPage({ hasNext: false });
			setLastSearchQuery({ query: "" });
			return;
		}

		if (!query.trim()) {
			setSearchResults({ results: [] });
			setSearchError({ error: null });
			setLastSearchQuery({ query: "" });
			return;
		}

		if (query === lastSearchQuery && searchResults.length > 0) {
			return;
		}

		let ignore = false;

		const timeoutId = setTimeout(async () => {
			try {
				setSearching({ searching: true });
				setSearchError({ error: null });
				resetPagination();

				const response = await fetch(
					`/api/sounds/search?q=${encodeURIComponent(query)}&type=effects&page=1`,
				);

				if (!ignore) {
					if (response.status === 401) {
						setSearchResults({ results: [] });
						setHasNextPage({ hasNext: false });
						setTotalCount({ count: 0 });
						setLastSearchQuery({ query });
						return;
					}

					if (!response.ok) {
						setSearchError({ error: `Search failed: ${response.status}` });
						return;
					}

					const data = await response.json();
					setSearchResults({ results: data.results });
					setLastSearchQuery({ query });
					setHasNextPage({ hasNext: !!data.next });
					setTotalCount({ count: data.count });
					setCurrentPage({ page: 1 });
				}
			} catch (err) {
				if (!ignore) {
					setSearchError({
						error: err instanceof Error ? err.message : "Search failed",
					});
				}
			} finally {
				if (!ignore) {
					setSearching({ searching: false });
				}
			}
		}, 300);

		return () => {
			clearTimeout(timeoutId);
			ignore = true;
		};
	}, [
		signedIn,
		query,
		lastSearchQuery,
		searchResults.length,
		setSearchResults,
		setSearching,
		setSearchError,
		setLastSearchQuery,
		setCurrentPage,
		setHasNextPage,
		setTotalCount,
		resetPagination,
	]);

	return {
		results: searchResults,
		isLoading: isSearching,
		error: searchError,
		loadMore,
		hasNextPage,
		isLoadingMore,
		totalCount,
	};
}
