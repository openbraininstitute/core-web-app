> Please visit this link for more details: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr

### in server page

```ts
// NOTE: DO THIS
import { getQueryClient, trpc } from "@/query-provider/server";
import { HydrateClient } from "@/query-provider/server";

export default async function Page() {
  const queryClient = getQueryClient();
  const user = await queryClient.fetchQuery();

  return (
    <HydrateClient>
    {children}
    </HydrateClient>
  )
}
```

```ts
/*
  * a good rule of thumb is to avoid queryClient.fetchQuery unless you need to catch errors.
  * If you do use it, don't render its result on the server or pass the result to another component, even a Client Component one.
  */
// NOTE: DON'T do this 👇🏼
export default async function PostsPage() {
  const queryClient = new QueryClient()

  // Note we are now using fetchQuery()
  const posts = await queryClient.fetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })
  const comments = await queryClient.fetchQuery({
    queryKey: ['comments'],
    queryFn: getComments,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* This one */}
      <div>Nr of posts: {posts.length}</div>
      <Posts />
      {/* This too */}
      <Comments comments={comments}/>
    </HydrationBoundary>
  )
}
```

```ts
import { getQueryClient, trpc } from "@/query-provider/server";
import { HydrateClient } from "@/query-provider/server";

export default async function Page() {
  const queryClient = getQueryClient();
  const user = await queryClient.fetchQuery(...);

  return(
     <HydrateClient>
      <div className="flex justify-between py-6">
        <Compo1>
      </div>

      <Suspense fallback={<Loading />}>
         <Compo2>
      </Suspense>
    </HydrateClient>
  )
}
```

```ts
// Comp1.tsx
import { useQuery } from "@tanstack/react-query";

export function Compo1() {
  const { data } = useQuery(
    ....
  );
  return <div />
}
```

```ts
// Comp2.tsx
import { useQuery } from "@tanstack/react-query";

export function Compo2() {
  const { data } = useSuspenseQuery(
    ....
  );
  return <div />
}
```

### in client page/component

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
export function Component() {
  const queryClient = useQueryClient();

  const deleteTransactionsMutation = useMutation(updateUserSubscription, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: 'key',
      });
    },
  });
}
```

or:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export function Component() {
  const queryClient = useQueryClient();
  const { data } = useQuery("key", ...);
}
```

### with suspense

```ts

// page.tsx
import { getQueryClient, trpc } from "@/query-provider/server";
export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient.fetchQuery(...)

  return (
    <div className="space-y-12">
        <Suspense>
            <DataTable />
        </Suspense>
    </div>
  );
}

// DataTable.tsx
"use client";
export function DataTable() {
  const { data } = useSuspenseQuery({
    ...options,
  });
  return <Table ...>
}
```
