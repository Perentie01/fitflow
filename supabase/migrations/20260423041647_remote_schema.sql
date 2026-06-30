drop policy "Users can insert own messages" on "public"."coach_messages";

drop policy "Users can read own messages" on "public"."coach_messages";

revoke delete on table "public"."coach_messages" from "anon";

revoke insert on table "public"."coach_messages" from "anon";

revoke references on table "public"."coach_messages" from "anon";

revoke select on table "public"."coach_messages" from "anon";

revoke trigger on table "public"."coach_messages" from "anon";

revoke truncate on table "public"."coach_messages" from "anon";

revoke update on table "public"."coach_messages" from "anon";

revoke delete on table "public"."coach_messages" from "authenticated";

revoke insert on table "public"."coach_messages" from "authenticated";

revoke references on table "public"."coach_messages" from "authenticated";

revoke select on table "public"."coach_messages" from "authenticated";

revoke trigger on table "public"."coach_messages" from "authenticated";

revoke truncate on table "public"."coach_messages" from "authenticated";

revoke update on table "public"."coach_messages" from "authenticated";

revoke delete on table "public"."coach_messages" from "service_role";

revoke insert on table "public"."coach_messages" from "service_role";

revoke references on table "public"."coach_messages" from "service_role";

revoke select on table "public"."coach_messages" from "service_role";

revoke trigger on table "public"."coach_messages" from "service_role";

revoke truncate on table "public"."coach_messages" from "service_role";

revoke update on table "public"."coach_messages" from "service_role";

alter table "public"."coach_messages" drop constraint "coach_messages_role_check";

alter table "public"."coach_messages" drop constraint "coach_messages_user_id_fkey";

alter table "public"."coach_messages" drop constraint "coach_messages_pkey";

drop index if exists "public"."coach_messages_pkey";

drop table "public"."coach_messages";


