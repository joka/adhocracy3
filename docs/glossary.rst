.. _glossary:

Glossary
========

.. glossary::
   :sorted:

   ACM
      An Access Control Matrix defines the rights of a list of
      principals. An ACM crosses principals with permissions. At the
      intersection of a principal and a permission there is an action.
      The action can be either :data:`pyramid.security.Allow`,
      :data:`pyramid.security.Deny` or :const:`None`. None is a default value and
      does not grant any right.

   post_pool
      A normal or :term:`service` :class:`adhocracy_core.interfaces.IPool` that
      serves as the common place to post resources of a special type for a
      given context.
      If `resource sheet` field with backreferences sets a
      :class:`adhocracy_core.schema.PostPool` field, the
      referencing resources can only be postet at the :term:`post_pool`.
      This assumes that a post_pool exists in the :term:`lineage` of the referenced
      resources.
      If a `resource sheet` field with references sets this, the
      referenced resource type can only be posted to :term:`post_pool`.

   service
      A resource marked as `service`. Services
      may provide special rest api end points
      and helper methods. You can find them by their name with
      :func:`adhocracy_core.interfaces.IPool.find_service`.
      The `service` has to be in :term:`lineage` or a child of a
      :term:`lineage` pool for a given :term:`context`.

   principal
       A principal is a string representing a :term:`userid`, :term:`groupid`,
       or :term:`roleid`. It is provided by an :term:`authentication policy`.
       For more information about the permission system read
       :doc:`api/authentication_api`.

   userid
      The unique id for one userique id of one :term:`group`: "group:<name>".

   group
       A set of users. Can be mapped to permission :term:`role`.

   groupid
       Unique id of one :term:`group`: "group:<name>".

   role
      A set of permissions that can be mapped to :term:`principal`

   roleid
       Unique id of one permission :term:`role`: "role:<name>".

   local role
       A :term:`role` mapped to a :term:`principal` within a local
       context and all his children.

   DAG
       Versions of one resource that build a directed acyclic graph.

